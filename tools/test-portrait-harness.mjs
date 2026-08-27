// C04 — shared characterization harness for journey/chapters/owned/portraits.js
// and journey/lib/baked.js (the "fake loader/clock" plumbing the C04 order
// asks for). NOT a test file itself — mirrors tools/test-c01-harness.mjs's
// convention of infra living beside the suites that consume it, named to
// match the C04 tools/test-portrait-*.mjs family so it stays inside this
// order's allowlist.
//
// WHY REWRITE-ON-DISK, NOT STATIC-ONLY (as C01 did for journey.js/ui.js/
// rail.js): portraits.js and baked.js both `import * as THREE from 'three'`,
// a bare specifier the page resolves only via index.html's
// `<script type="importmap">` — Node has no equivalent. Rather than settle
// for source-text analysis, this harness reads the REAL file, rewrites ONLY
// its import specifiers (three -> vendor/three/three.module.js, every local
// relative -> its real absolute path, applied recursively to every local
// file it pulls in) and writes the otherwise-byte-identical result to an OS
// temp directory Node can execute from. Production source is read, never
// edited; the rewritten copies live entirely outside the repo tree.
//
// Consumers: tools/test-portrait-dealer.mjs, tools/test-portrait-baked.mjs,
// tools/test-portrait-textures.mjs, tools/test-portrait-lifecycle.mjs,
// tools/test-portrait-perturbation.mjs.

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createStager } from './stage-tree.mjs';

export const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');

/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: 201 roots standing on this machine, and   *
 * by BYTES the heaviest leaker in the gate at 274 MiB - it stages whole  *
 * module trees. This is a MODULE, not a gated suite: six suites in the   *
 * check chain import it (portrait-baked, -textures, -dealer, -paint,     *
 * -perturbation, -lifecycle), each in its own process, so the cost was   *
 * 5-6 roots per check rather than one. The hook is registered here, in   *
 * the module that mints the tree, so every importer is covered without   *
 * any of the six needing to know.                                        *
 *                                                                        *
 * ROUTED THROUGH THE SHARED INSTRUMENT, not a local rmSync. tools/stage- *
 * tree.mjs has exposed stageTree.cleanup() since D84 and was fixed long  *
 * ago; this consumer simply never called it. Calling it is strictly      *
 * cheaper than a local finally here - no new import, no second path to   *
 * the same directory, and the removal stays owned by the module that     *
 * created the tree.                                                      *
 *                                                                        *
 * cleanup() is documented as OPT-IN and stays opt-in: this change opts   *
 * ONE caller in, it does not make the stager clean up behind everybody.  *
 *                                                                        *
 * WHY AN EXIT HOOK AND NOT try/finally: the root is created at module    *
 * top level, where there is no enclosing try to attach a finally to -    *
 * and this suite terminates through process.exit(), which does NOT run   *
 * finally blocks. Both halves are measured by the positive control in    *
 * this order's evidence directory (hygiene-01/control-exit-hook.mjs).    *
 * cleanup() is already best effort internally.                           *
 * ====================================================================== */
const scratchRoot = mkdtempSync(join(tmpdir(), 'c04-portraits-'));

/** Recursively rewrite `entryAbsPath`'s import specifiers to absolute file://
 *  URLs (three -> vendor, local relatives -> their rewritten twin) and write
 *  the result under a fresh scratch subdirectory. `salt` forces a brand-new
 *  set of output files (and therefore a brand-new Node module registration)
 *  even for the exact same source tree — the only way to get an independent
 *  singleton instance of a module like baked.js, whose top-level state is
 *  otherwise cached for the life of the process once imported once.
 *
 *  QA-07: this was one of SEVEN hand-written copies, now tools/stage-tree.mjs.
 *  C04's copy was the outlier of the seven in two ways — it returned a BARE
 *  PATH rather than a file:// URL (its three call sites prepended the scheme
 *  by hand), and it took `salt` positionally rather than in an options object.
 *  Both are the shared contract now, so the call sites below no longer
 *  prepend anything. It also had no override/asIf/asIfMap/patch; the shared
 *  form is the union and nothing here passes what C04 lacked.
 *
 *  REPO is still derived here, from THIS file's own location, and is passed
 *  IN. The shared module derives no path of its own: every consumer of it
 *  lives in tools/, so a `resolve(dirname(import.meta.url), '..')` lifted
 *  into it would compute the correct root for all seven and the wrong one
 *  for the first consumer placed anywhere else — a defect undetectable from
 *  inside the current consumer set (D87). */
const rewriteTree = createStager({
  scratchRoot,
  threePath: join(REPO, 'vendor/three/three.module.js'),
  label: 'C04 portraits',
});

/** THREE, loaded once from the real vendored file (no rewrite needed — it
 *  has no bare-specifier imports of its own). Real THREE.Vector3 etc. are
 *  used directly in the fixtures below so vector math in the real placement
 *  code runs unmodified. */
process.on('exit', () => { rewriteTree.cleanup(); });

export const THREE = await import('file://' + REPO + '/vendor/three/three.module.js');

/** journey/chapters/owned/portraits.js, loaded once (its own top-level scope
 *  holds no mutable state — every stateful thing lives inside a
 *  buildPortraitField() closure — so one shared module instance is correct
 *  for every test; independent instances come from calling
 *  buildPortraitField() again, not from reloading the module). */
export const portraitsModule = await import(rewriteTree(join(REPO, 'journey/chapters/owned/portraits.js')));

/** journey/lib/baked.js, loaded FRESH — its `ready`, `manifest` and `bins`
 *  ARE module-top-level singleton state (the point of characterizing item 6:
 *  "does a second instance see state from the first"). Every test that needs
 *  independent baked-module state must call this again with a distinct tag.
 *
 *  `bakedModuleUrl(tag)` is the lower-level primitive: it does the rewrite
 *  and returns the resolved file:// URL WITHOUT importing it, so a caller
 *  can `import()` that exact URL more than once. Node's ESM loader caches
 *  modules by resolved URL, so two separate `import(url)` calls on the SAME
 *  url return the IDENTICAL module namespace object — this is what lets
 *  test-portrait-baked.mjs's B5 simulate two genuinely independent
 *  production import sites (e.g. two different chapter files each writing
 *  their own `import { isBaked } from '../lib/baked.js'`) sharing one
 *  instance, instead of merely comparing a JS variable to itself. */
export function bakedModuleUrl(tag) {
  return rewriteTree(join(REPO, 'journey/lib/baked.js'), { salt: `baked-${tag}` });
}
export function loadBakedFresh(tag) {
  return import(bakedModuleUrl(tag));
}

/** journey/chapters/owned/portrait-textures.js has zero imports, so it needs
 *  no rewriting; loaded via its real absolute path, unmodified. */
export const textureOwnerModule = await import('file://' + join(REPO, 'journey/chapters/owned/portrait-textures.js'));

/** journey/chapters/owned/portrait-deal.js has no THREE/DOM use of its own,
 *  but it imports journey/lib/helpers.js, which DOES `import * as THREE from
 *  'three'` — so it still needs the same specifier rewrite as portraits.js. */
export const dealerModule = await import(rewriteTree(join(REPO, 'journey/chapters/owned/portrait-deal.js')));

/* ------------------------------------------------------------------ *
 * Fake browser surface — installed once at module scope (portraits.js  *
 * and baked.js both read matchMedia/requestIdleCallback/document at    *
 * call time, not import time, so a single shared install is enough;   *
 * per-test behaviour — image load timing/outcome, fetch outcome — is  *
 * reconfigured through the returned handles before each scenario).    *
 * ------------------------------------------------------------------ */

/** A canvas 2D context double that accepts any call (arc/fill/stroke/
 *  gradients/...) as a no-op and remembers any property explicitly set on
 *  it. Sufficient because none of the characterization here depends on
 *  pixels — only on the real control flow (dispose/tickSwap/remix/atlas
 *  bookkeeping) not throwing and not silently short-circuiting. */
function makeFakeCanvasContext() {
  const store = {};
  return new Proxy(store, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      return () => undefined;
    },
  });
}

function makeFakeCanvas() {
  return { width: 0, height: 0, getContext: () => makeFakeCanvasContext() };
}

globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeFakeCanvas() : {}),
};
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: false });

/** The fake image loader — the "fake loader" the C04 order asks for. Every
 *  `new Image()` reads the CURRENT mode/delay from `imageLoader`'s mutable
 *  fields at the moment `.src` is set, so a test can reconfigure it between
 *  scenarios without re-importing anything. */
export const imageLoader = { mode: 'success', delayMs: 0, images: [] };
globalThis.Image = class {
  constructor() { imageLoader.images.push(this); }
  set src(v) {
    this._src = v;
    const mode = imageLoader.mode;
    if (mode === 'hang') return; // the fake loader that never settles
    const fire = () => {
      if (mode === 'fail') this.onerror && this.onerror(new Error('fake image load failure'));
      else this.onload && this.onload();
    };
    if (imageLoader.delayMs > 0) setTimeout(fire, imageLoader.delayMs);
    else fire();
  }
};

/** The fake network loader baked.js's `ready` IIFE calls. Reconfigure
 *  `fetchController.mode`/`delayMs` before each `loadBakedFresh()` call. */
export const fetchController = { mode: 'no-manifest', delayMs: 0, calls: [] };
globalThis.fetch = async (url) => {
  fetchController.calls.push(String(url));
  const { mode, delayMs } = fetchController;
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  if (mode === 'hang') return new Promise(() => {}); // never settles
  if (mode === 'network-error') throw new Error('fake network error');
  if (mode === 'no-manifest') return { ok: false };
  if (mode === 'manifest-ok') {
    if (String(url).endsWith('manifest.json')) {
      return { ok: true, json: async () => fetchController.manifest };
    }
    const bin = fetchController.bins && fetchController.bins[url];
    if (bin === 'reject') throw new Error('fake per-chapter fetch error');
    if (bin === 'not-ok') return { ok: false };
    return { ok: true, arrayBuffer: async () => (bin || new ArrayBuffer(0)) };
  }
  throw new Error(`unhandled fetchController.mode: ${mode}`);
};

/* ------------------------------------------------------------------ *
 * Fixtures for buildPortraitField — deliberately minimal: placement     *
 * math correctness is out of scope for C04 (it is C-other territory);  *
 * these fakes only need to keep the real placement/atlas/dispose code   *
 * running to completion without throwing or producing NaNs.            *
 * ------------------------------------------------------------------ */

export function makeFakeLeg() {
  const V3 = THREE.Vector3;
  const frame = { fov: 50, pos: new V3(0, 0, 0), fwd: new V3(0, 0, -1), right: new V3(1, 0, 0), up: new V3(0, 1, 0) };
  return {
    portraitField: false,
    restFrame: frame,
    restFramePortrait: frame,
    portraitAspect: 0.56,
    projectInto: () => ({ x: 0, y: 0, z: 8 }),
    clampUnder: (pos) => pos,
    camDist: () => 20,
    nearestCamPt: () => new V3(0, 0, 0),
    groundY: () => -5,
  };
}

export function makeFakeSubstrate() {
  const V3 = THREE.Vector3;
  return {
    nearestCordPoint: (target) => (target && target.clone ? target.clone() : new V3(0, 0, 0)),
    inVoid: () => false,
  };
}

export function makeFakePalette() {
  return new Proxy({}, { get: () => 0x88ccff });
}

export function makeContributors(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `person-${i}`, seed: i + 1, name: `Person ${i}`, role: 'artist', blurb: `blurb ${i}`, consent: true,
  }));
}

/** Build one independent buildPortraitField() instance with sane fixtures.
 *  `overrides` merges into the args object (e.g. { photosEnabled: false }). */
export function buildField(overrides = {}) {
  const { contributors: overrideContributors, ...rest } = overrides;
  const contributors = overrideContributors || makeContributors(rest.nodeCount || 6);
  return portraitsModule.buildPortraitField({
    leg: makeFakeLeg(),
    contributors,
    substrate: makeFakeSubstrate(),
    palette: makeFakePalette(),
    nodeCount: contributors.length,
    exposure: 1,
    photosEnabled: true,
    ...rest,
  });
}

/* ------------------------------------------------------------------ *
 * Assertion bookkeeping — same shape as tools/test-c01-harness.mjs's   *
 * createLedger, reimplemented locally so this order's files carry no  *
 * import dependency on another order's file.                          *
 * ------------------------------------------------------------------ */

export function createLedger(title) {
  const rows = [];
  return {
    rows,
    check(area, name, pass, value, trace) {
      rows.push({ area, name, pass: !!pass, value, trace });
      return !!pass;
    },
    same(area, name, value, expected, trace) {
      const a = JSON.stringify(value);
      const b = JSON.stringify(expected);
      rows.push({ area, name, pass: a === b, value: a, trace: { expected: b, ...(trace || {}) } });
      return a === b;
    },
    report() {
      let failed = 0;
      const byArea = new Map();
      for (const row of rows) {
        if (!row.pass) failed++;
        byArea.set(row.area, (byArea.get(row.area) || 0) + 1);
      }
      for (const row of rows) {
        const value = typeof row.value === 'number' ? row.value.toFixed(6) : String(row.value);
        console.log(`${row.pass ? 'PASS' : 'FAIL'} [${row.area}] ${row.name}: ${value}`
          + (row.trace ? ` ${JSON.stringify(row.trace)}` : ''));
      }
      const areas = [...byArea].map(([a, c]) => `${a}=${c}`).join(' ');
      console.log(`${title}: ${rows.length - failed}/${rows.length} PASS (${areas})`);
      return failed;
    },
  };
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ====================================================================== *
 * VIEWPORT-01 — the REAL leg and the REAL substrate.                      *
 *                                                                        *
 * Everything above deliberately fakes `leg` and `substrate`: C04          *
 * characterizes dispose/async/atlas bookkeeping, and for that a `leg`     *
 * whose projectInto() always answers {0,0,8} is not merely adequate, it   *
 * is the right fixture — it keeps placement out of the way.               *
 *                                                                        *
 * It also makes those suites STRUCTURALLY BLIND to the whole class of     *
 * defect VIEWPORT-01 closed. makeFakeLeg() has no `fieldFor`, so          *
 * portraits.recompose() returns false on its first line and the           *
 * band-crossing path never runs; and with a constant projection every     *
 * composition looks the same, so "which sixteen sites, composed against   *
 * which frame" has no meaning at all. The property that matters — that a  *
 * page which crossed the portrait band is composed like a page freshly    *
 * loaded on the far side of it — can only be measured against the leg     *
 * that really samples the director's poseAt() and the substrate that      *
 * really answers inVoid().                                                *
 *                                                                        *
 * So this is a SECOND fixture set, not a replacement: nothing above       *
 * changes, and only the suite that asks pays for it. The two placement    *
 * modules are staged lazily on first use (a buildLeg() samples 107 camera *
 * poses and a buildSubstrate() runs ~4300 void tests, ~0.4 s together     *
 * on this machine) so the five suites that never call this import         *
 * nothing extra.                                                          *
 * ====================================================================== */

let realPlacementModules = null;
async function loadRealPlacement() {
  if (!realPlacementModules) {
    realPlacementModules = {
      legMod: await import(rewriteTree(join(REPO, 'journey/chapters/owned/leg.js'), { salt: 'real-leg' })),
      subMod: await import(rewriteTree(join(REPO, 'journey/chapters/owned/substrate.js'), { salt: 'real-substrate' })),
    };
  }
  return realPlacementModules;
}

/** Build one portrait field the way a real page of `width` x `height` would:
 *  the real leg (which reads window.innerWidth/innerHeight for its build
 *  aspect, exactly as the chapter does), the real substrate, and the real
 *  buildPortraitField(). Photos are off — the placement law never reads them,
 *  and leaving them on would drag the fake Image loader into a measurement
 *  that has nothing to do with it. */
export async function buildRealField({ width, height, nodeCount = 16 } = {}) {
  const { legMod, subMod } = await loadRealPlacement();
  globalThis.innerWidth = width;
  globalThis.innerHeight = height;
  const leg = legMod.buildLeg();
  const substrate = subMod.buildSubstrate({ leg, palette: makeFakePalette(), exposure: 1 });
  const api = portraitsModule.buildPortraitField({
    leg,
    contributors: makeContributors(nodeCount),
    substrate,
    palette: makeFakePalette(),
    nodeCount,
    exposure: 1,
    photosEnabled: false,
  });
  return { leg, substrate, api, restP: legMod.REST_P, aspect: width / height };
}

/** The sixteen node positions, as plain numbers — the composition itself,
 *  comparable between two independently built fields. */
export function placementOf(built) {
  return built.api.nodes.map((n) => [n.pos.x, n.pos.y, n.pos.z]);
}

/** How many of the field's faces land inside the frame the camera ACTUALLY
 *  shows at `aspect`. This is the owner's own report ("the number of items
 *  that shows in the ownership section") turned into a number: leg.frameAt()
 *  re-poses through portrait.js at the live aspect, so a field composed for
 *  the other band is judged through the lens the visitor is really looking
 *  through — which is precisely what a stale composition gets wrong. */
export function framedCount(built, aspect) {
  const frame = built.leg.frameAt(built.restP, aspect);
  let n = 0;
  for (const node of built.api.nodes) {
    const p = built.leg.projectInto(frame, node.pos, aspect);
    if (p.z > 0 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1) n++;
  }
  return n;
}
