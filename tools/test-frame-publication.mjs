#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-frame-publication.mjs — J02, the immutable frame publication.
 *
 * SUBJECT
 *   journey/frame/publication.js  the publisher: one frozen value per frame,
 *                                 taken where the camera is finished.
 *   journey/journey.js            the seam: where it is taken, and what it
 *                                 stopped reaching for afterwards.
 *
 * WHAT IS BEING PROVED, IN ONE SENTENCE
 *   A reader handed the frame cannot see a pose that is not the presented
 *   one, because the frame is frozen through and through, holds no path back
 *   to the camera, and the camera is touched exactly once per frame — at the
 *   publication — after which no read of the value reaches it again.
 *
 * THE FOUR KINDS OF ROW, AND WHY THEY ARE NOT INTERCHANGEABLE
 *   A is STRUCTURAL and EXECUTED: the value's own shape, audited leaf by
 *     leaf out of the published object rather than against a typed list, with
 *     Object.isFrozen EXECUTED because a canonicaliser cannot see frozenness.
 *   B is TEMPORAL and EXECUTED: the accessor trap. Every camera member the
 *     publication reads is replaced by a recording accessor, and the log is
 *     read AFTER the publication returns. This is the row that says "no
 *     reader re-reads mutable camera state", and it says it by counting
 *     accesses rather than by comparing values.
 *   C is STATIC: the publication point, and journey.js's one substitution.
 *     A backstop. Not runtime evidence, and section C2 states in a fixture
 *     why the frame-order suite's S2 must not be cited as one either.
 *   D is an ORACLE: the pose's pre-computed `az`/`r`/`fwdY` are compared
 *     against the SHIPPED derivations, sliced out of three other files'
 *     own text and executed. Two sides from two authors, not one formula
 *     restated.
 *
 * D46 — every assert-zero carries its positive control in the same array.
 * D94 — no pin reads a hand-written collection: the leaf audit walks the
 *   published object, the camera-file list comes off the disk, the oracle's
 *   right-hand side is sliced out of production text.
 * D99 — and the collections are SITE SETS, never bare counts.
 * D54 — every derived collection also carries a cardinality literal, so a
 *   scan that went blind reports zero rows against a non-zero pin.
 *
 * D88, THE REGISTRY'S DECLARED BLIND SPOTS, because this subject walks into
 *   two of them. `inputCanon` CANNOT SEE FROZEN-NESS: a mutant that only
 *   unfreezes the publication moves nothing it can observe. Freezing is
 *   therefore proved by EXECUTING Object.isFrozen inside the reader (A2),
 *   never by canonicalising. It also has NO Map branch: no input below is a
 *   Map. And it hashes String(fn) for a function, so every text mutant here
 *   compiles the mutated SOURCE through new Function — whose String() is
 *   the mutated text — rather than perturbing an already-compiled closure.
 *
 * D84 — WHAT THIS FILE DOES NOT RE-DERIVE. The ledger, the sentinel, the
 *   harness-fault type, the mutant registry, the comment stripper and the
 *   vendor resolver for `three` all come from tools/. Nothing is copied. No
 *   tree is staged and nothing is written (D56).
 *
 * D93 — every slice is anchored on TEXT and REFUSES on a miss. No line
 *   number appears in any anchor.
 *
 * WHAT THIS SUITE DOES NOT PROVE — stated here rather than in a README
 * nobody reads with the code:
 *   * It does not prove any chapter reader consumes the frame. In this
 *     slice none does: boundaries.md sectionB.6 rows 2-6 migrate with
 *     R05-R07, and row 1's file is reserved read-only-hard by slices.md.
 *     The one production consumer is applyChapterFrame's `gliding`.
 *   * It does not run a browser. Nothing here measures a real frame, a real
 *     rAF or a real resize.
 *
 * Usage:
 *   node tools/test-frame-publication.mjs
 *   node tools/test-frame-publication.mjs --prove-failure
 * ==================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { stripComments } from './strip-comments.mjs';
import {
  literalPredicateRe, literalPredicateHits, literalPredicateProbe,
  maskedToken, selfSiteSet, scanTautologyAst,
} from './self-controls.mjs';
import {
  HarnessFault, fault, mutateText, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';
import { installVendorResolver } from './render-report-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');

const SENTINEL = armSentinel('test-frame-publication', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const SELF_PATH = fileURLToPath(import.meta.url);
const SRC_SELF = readFileSync(SELF_PATH, 'utf8');

const PUBLICATION = 'journey/frame/publication.js';

const SRC = {
  publication: read(PUBLICATION),
  journey: read('journey/journey.js'),
  director: read('journey/director.js'),
  seams: read('journey/seams.js'),
  connect: read('journey/chapters/connect/index.js'),
  baseline: read('tools/test-render-baseline.mjs'),
  frameOrder: read('tools/test-frame-order.mjs'),
};

/* ------------------------------------------------------------------ *
 * The environment. Installed BEFORE the subject is imported.          *
 * ------------------------------------------------------------------ *
 * A counting clock, because `at` is a NEW per-frame read (design.md
 * section 12 row 6) and "read once" is a property only a counter can state.
 * A window with a viewport, because the publication is the frame's one
 * viewport authority. Neither exists in Node; neither is faked anywhere
 * else in this file. */
const CLOCK = { reads: 0, value: 1000 };
globalThis.performance = { now: () => { CLOCK.reads += 1; return CLOCK.value; } };
const VIEW = { w: 1440, h: 900 };
globalThis.window = {
  get innerWidth() { return VIEW.w; },
  get innerHeight() { return VIEW.h; },
};

/* THREE, BY THE PATH THE ALIAS POINTS AT — not by the bare specifier.
 *
 * `three` is VENDORED in this repository, not an npm package, so it must
 * never enter tools/check-cycles.mjs's DECLARED_EXTERNALS: that list is for
 * genuine third-party dependencies and an entry there would hide a real edge
 * from the graph, which is the hazard the cycles gate exists to catch. But a
 * bare `import('three')` from a tools/*.mjs file is UNRESOLVABLE to madge —
 * madge.webpack.cjs's `three$` alias does not reach it — and an unresolved
 * import is a dependency-analysis hole, measured: `Skipped 1 local file
 * (UNRESOLVED)`, npm run cycles exit 1.
 *
 * So the specifier is the alias's own target, written out. madge resolves a
 * relative path with no alias at all, and Node resolves it to the SAME URL
 * the vendor resolver hands journey/frame/publication.js — one module
 * instance, not two. C7 pins the specifier against madge.webpack.cjs's alias
 * so that moving the vendored file reds this suite instead of silently
 * giving it a second copy of three.
 *
 * The resolver is still installed, because the SUBJECT imports `three` by
 * the bare specifier as every production file does. */
installVendorResolver();
const THREE = await import('../vendor/three/three.module.js');
const PUB = await import(join(REPO, PUBLICATION));

/* ------------------------------------------------------------------ *
 * Slicing — text-anchored, refusing on a miss (D93).                  *
 * ------------------------------------------------------------------ */

/** The one line of `src` containing `needle`, trimmed. A miss is a fault —
 *  and so is an AMBIGUITY. director.js carries two `hero.az = Math.atan2(`
 *  sites, one keyed off a view record and one off the live camera, and a
 *  first-hit slice silently took the wrong one. A slice that could mean two
 *  things is not an anchor (D93). */
function lineWith(tag, src, needle) {
  const hits = stripComments(src, { blankStrings: false })
    .split('\n').map((l) => l.trim()).filter((l) => l.includes(needle));
  if (!hits.length) fault(`${tag}: ANCHOR MISS on ${JSON.stringify(needle)}`);
  if (hits.length > 1) fault(`${tag}: ANCHOR AMBIGUOUS — ${hits.length} lines contain ${JSON.stringify(needle)}`);
  return hits[0];
}

/** `header` through the first line equal to `close`. A miss is a fault. */
function fnSlice(tag, src, header, close = '  }') {
  const lines = src.split('\n');
  const a = lines.indexOf(header);
  if (a < 0) fault(`${tag}: ANCHOR MISS on header ${JSON.stringify(header)}`);
  const b = lines.indexOf(close, a + 1);
  if (b < 0) fault(`${tag}: ANCHOR MISS on the closing ${JSON.stringify(close)} after ${header}`);
  return lines.slice(a, b + 1).join('\n');
}

/** applyFrame's body, comment- and string-blanked, as the static rows read it. */
const APPLY_FRAME = fnSlice('applyFrame',
  stripComments(SRC.journey, { blankStrings: true }), '  function applyFrame(p, dt) {');

/** The whole publisher compiled out of its own text, so a mutant of that
 *  text is a mutant of the shipped subject (D58). A0 is the control that the
 *  compile is faithful. `THREE`, `window` and `performance` are passed as
 *  PARAMETERS so the compiled copy shadows the globals and a mutant cannot
 *  quietly reach a different one. */
function compilePublisher(src) {
  const noImports = src.replace(/^import[^;]*;\n/gm, '');
  if (noImports.includes('\nimport ')) fault('compile: an import survived the strip');
  const marker = 'export function createFramePublisher';
  if (!src.includes(marker)) fault('compile: ANCHOR MISS on the factory export');
  const body = noImports.replace(marker, 'return function createFramePublisher');
  try {
    return new Function('THREE', 'window', 'performance', body)(THREE, globalThis.window, globalThis.performance);
  } catch (e) { fault(`the publisher did not compile out of its own text — ${e.message}`); }
  return null;
}

/* ------------------------------------------------------------------ *
 * The rig.                                                            *
 * ------------------------------------------------------------------ */

/** A scene handle with a REAL perspective camera, so getWorldDirection is
 *  three's own and the pose is copied out of a genuine THREE object — which
 *  is the thing the publication must not let escape. */
function makeScene({ pos, target, fov = 45, fogNear = 7, fogFar = 20 }) {
  const camera = new THREE.PerspectiveCamera(fov, 1.6, 0.1, 200);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateMatrixWorld(true);
  return {
    camera,
    controls: { target: new THREE.Vector3(target[0], target[1], target[2]) },
    scene: { fog: { near: fogNear, far: fogFar } },
  };
}

const NO_BLEND = Object.freeze({
  blend: null, railWrap: null, railFlight: null, cameraStateDisagree: false,
});
const WRAP = Object.freeze({
  blend: { play: -1, routeFromP: 0.42, routeTargetP: 0 },
  railWrap: { dir: 1, homeP: 0.42, phase: 0.25 },
  railFlight: null,
  cameraStateDisagree: true,
});
/* THE SAME WRAP, FLYING FORWARD (D1/C10). WRAP above is a REWOUND lap —
   `play` -1 — so a `kind` that keyed off the blend's direction instead of
   off the ticket would agree with it and nobody would know. The shipped
   route produces this shape on every ordinary wrap: directJumpTo installs
   the ticket and beginBlend records `play: 1`. */
const WRAP_FWD = Object.freeze({
  blend: { play: 1, routeFromP: 0.95, routeTargetP: 0 },
  railWrap: { dir: -1, homeP: 0.95, phase: 0.6 },
  railFlight: null,
  cameraStateDisagree: true,
});
const FLIGHT = Object.freeze({
  blend: { play: 1, routeFromP: 0.1, routeTargetP: 0.65 },
  railWrap: null,
  railFlight: { fromP: 0.1, targetP: 0.65, phase: 0.5 },
  cameraStateDisagree: true,
});
/* The shape the shipped route never produces: a blend with no rail motion.
   The publisher's two defaults answer for it, and this is what exercises
   them — an unreachable branch that no test enters is D75's shape. */
const BARE = Object.freeze({
  blend: { play: 1, routeFromP: 0.2, routeTargetP: 0.3 },
  railWrap: null, railFlight: null, cameraStateDisagree: false,
});

const SPINE = Object.freeze({ dt: 0.016, stateP: 0.3, routeP: 0.31, presentedP: 0.32, gliding: true });

/** One publication, from a factory, over one scene and one transition. */
function publishOn(factory, scene, transition, spine = SPINE) {
  const p = factory(scene);
  return p.publish({ ...spine, transition });
}

/* ------------------------------------------------------------------ *
 * A — E-B1: THE VALUE. Frozen through, primitives at every leaf, and  *
 *     no path from a reader's hand back to the camera.                *
 * ------------------------------------------------------------------ */
console.log('A — E-B1: the value, audited leaf by leaf out of the published object');

/** Walk the published value. Returns every leaf as `path=typeof`, every
 *  container as `path:frozen?`, and any leaf that is an object three owns.
 *  DERIVED FROM THE SUBJECT (D94): nothing here is a typed member list. */
function auditValue(v, path = 'frame', out = { leaves: [], containers: [], live: [] }) {
  if (v === null || typeof v !== 'object') {
    out.leaves.push(`${path}=${v === null ? 'null' : typeof v}`);
    return out;
  }
  out.containers.push(`${path}:${Object.isFrozen(v) ? 'frozen' : 'MUTABLE'}`);
  /* The escape routes this value must not contain, named by what they are
     rather than by their key: a three object, a scene handle, or anything
     carrying a live camera. */
  if (v.isObject3D || v.isVector3 || v.isCamera || v.isMaterial || v.camera || v.controls) {
    out.live.push(`${path}:${v.constructor ? v.constructor.name : 'anon'}`);
  }
  for (const k of Object.keys(v).sort()) auditValue(v[k], `${path}.${k}`, out);
  return out;
}

const SCENE_A = makeScene({ pos: [0, 5, -2], target: [0, 0, 0], fov: 45, fogNear: 7, fogFar: 20 });
const FRAME_A = publishOn(PUB.createFramePublisher, SCENE_A, FLIGHT);
const AUDIT_A = auditValue(FRAME_A);

pin('A1', 'every leaf of the publication is a primitive, and the leaf set is the SUBJECT\'s own — read out of the published object, never typed here',
  (i) => [i.audit.leaves,
    [...new Set(i.audit.leaves.map((s) => s.split('=')[1]))].sort(),
    i.audit.leaves.length],
  { audit: AUDIT_A },
  [['frame.aspectProfile=null', 'frame.at=number', 'frame.cameraPose.az=number',
    'frame.cameraPose.fogFar=number', 'frame.cameraPose.fogNear=number',
    'frame.cameraPose.fov=number', 'frame.cameraPose.fwdX=number',
    'frame.cameraPose.fwdY=number', 'frame.cameraPose.fwdZ=number',
    'frame.cameraPose.r=number', 'frame.cameraPose.tx=number',
    'frame.cameraPose.ty=number', 'frame.cameraPose.tz=number',
    'frame.cameraPose.x=number', 'frame.cameraPose.y=number', 'frame.cameraPose.z=number',
    'frame.dt=number', 'frame.gliding=boolean', 'frame.presentedP=number',
    'frame.routeP=number', 'frame.seq=number', 'frame.stateP=number',
    'frame.transitionPhase.disagree=boolean', 'frame.transitionPhase.e=number',
    'frame.transitionPhase.fromP=number', 'frame.transitionPhase.kind=string',
    'frame.transitionPhase.play=number', 'frame.transitionPhase.targetP=number',
    'frame.viewport.h=number', 'frame.viewport.w=number'],
    ['boolean', 'null', 'number', 'string'], 30],
  'D54: the cardinality is pinned beside the set, so a walk that went blind reports 0 leaves against 30 rather than an empty set that looks clean');

pin('A2', 'EVERY container is frozen — executed, because a canonicaliser cannot see frozen-ness (D88 blind spot, declared in the header)',
  (i) => [i.audit.containers, i.audit.containers.filter((c) => c.endsWith(':MUTABLE')), i.audit.containers.length],
  { audit: AUDIT_A },
  [['frame:frozen', 'frame.cameraPose:frozen', 'frame.transitionPhase:frozen', 'frame.viewport:frozen'],
    [], 4],
  'boundaries.md section B.1: frozen at construction. The zero carries its own subject beside it, so an empty walk cannot satisfy it');

pin('A3', 'D46 — the audit\'s live-object detector DOES fire on the thing it exists to refuse, and does NOT fire on the shipped value',
  (i) => [i.shipped.live,
    i.synth.live, i.synth.containers.filter((c) => c.endsWith(':MUTABLE')).length,
    i.real.live.filter((r) => r.endsWith(':PerspectiveCamera'))],
  { shipped: AUDIT_A,
    synth: auditValue({ cameraPose: { camera: { isCamera: true, position: { isVector3: true, x: 1 } } } }),
    real: auditValue({ cameraPose: { camera: SCENE_A.camera } }) },
  [[],
    ['frame.cameraPose:Object', 'frame.cameraPose.camera:Object', 'frame.cameraPose.camera.position:Object'], 4,
    ['frame.cameraPose.camera:PerspectiveCamera']],
  'two probes, both hand-derived before the run. The synthetic one is a publication that kept a camera and its position vector: three live rows — the holder, the camera, the vector — and four unfrozen containers counting the root. The second is the REAL three camera, pinned on the one row a constructor name can carry. Without them the shipped zero is the zero of a detector that never fires');

pin('A4', 'the value refuses a write — strict-mode assignment to any member throws, and the camera is unmoved by the attempt',
  (i) => {
    const t = (f) => { try { f(); return 'no throw'; } catch (e) { return e.constructor.name; } };
    return [t(() => { i.frame.stateP = 9; }),
      t(() => { i.frame.cameraPose.x = 9; }),
      t(() => { i.frame.viewport.w = 9; }),
      t(() => { delete i.frame.seq; }),
      i.frame.stateP, i.frame.cameraPose.x];
  },
  { frame: FRAME_A },
  ['TypeError', 'TypeError', 'TypeError', 'TypeError', 0.3, 0],
  'freezing is not decoration: a reader that tried to correct the pose in place would fail loudly rather than silently disagree with its neighbours');

/* ------------------------------------------------------------------ *
 * B — E-B4: THE ACCESSOR TRAP. The camera is touched once, at the     *
 *     publication, and never again by a reader of the value.          *
 * ------------------------------------------------------------------ */
console.log('\nB — E-B4: the accessor trap. Every camera read is RECORDED, and the log is read after the frame returns');

/** Replace every camera member the publication reads with an accessor that
 *  RECORDS AND NEVER THROWS (boundaries.md section B.7 E-B4: the throw form is
 *  forbidden — organism/animation.js deletes an animator that throws, so a
 *  throwing trap would be swallowed and would delete the reader it was
 *  built to observe). */
function trapScene(scene) {
  const log = [];
  const rec = (obj, key, tag) => {
    const held = obj[key];
    Object.defineProperty(obj, key, { get() { log.push(tag); return held; }, configurable: true });
  };
  /* three recomputes matrixWorld inside getWorldDirection, and that walk
     reads position.x/y/z itself. The matrix is already up to date here, so
     the auto-update is turned off and what the log holds is the SUBJECT's
     reads rather than three's. */
  scene.camera.matrixAutoUpdate = false;
  scene.camera.matrixWorldAutoUpdate = false;
  for (const k of ['x', 'y', 'z']) rec(scene.camera.position, k, `position.${k}`);
  for (const k of ['x', 'y', 'z']) rec(scene.controls.target, k, `target.${k}`);
  rec(scene.camera, 'fov', 'fov');
  for (const k of ['near', 'far']) rec(scene.scene.fog, k, `fog.${k}`);
  const original = scene.camera.getWorldDirection.bind(scene.camera);
  scene.camera.getWorldDirection = (v) => { log.push('getWorldDirection'); return original(v); };
  return log;
}

/** Publish under the trap, then do everything a READER does — call the
 *  accessor repeatedly, and walk every member of the value — and report the
 *  log at each stage. */
const TRAP = (() => {
  const scene = makeScene({ pos: [3, 1, 4], target: [0, 1, 0], fov: 38, fogNear: 9, fogFar: 41 });
  const log = trapScene(scene);
  const p = PUB.createFramePublisher(scene);
  const frame = p.publish({ ...SPINE, transition: WRAP });
  const duringPublish = [...log];
  for (let i = 0; i < 3; i++) p.frame();
  const afterAccessor = log.length;
  let sink = 0;
  for (const f of [frame, p.frame(), p.frame()]) {
    auditValue(f);
    sink += f.cameraPose.x + f.cameraPose.fov + f.cameraPose.fogNear + f.viewport.w;
  }
  return { duringPublish, afterAccessor, afterReaders: log.length, sink };
})();

pin('B1', 'THE PUBLICATION\'S OWN CAMERA READS, in order — every member read exactly once, in the order the publisher\'s own text reads them',
  (i) => [i.t.duringPublish, i.t.duringPublish.length,
    i.t.duringPublish.length - new Set(i.t.duringPublish).size],
  { t: TRAP },
  [['position.x', 'position.y', 'position.z', 'getWorldDirection',
    'target.x', 'target.y', 'target.z', 'fov', 'fog.near', 'fog.far'], 10, 0],
  'the third element is the DUPLICATE count: a publication that read the same member twice would be reading a camera that could have moved between the two reads, and this is the row that says it does not');

pin('B2', 'AFTER THE PUBLICATION RETURNS, no read of the value touches the camera — three accessor calls and a full walk of three frames add ZERO entries',
  (i) => [i.t.afterAccessor - i.t.duringPublish.length,
    i.t.afterReaders - i.t.duringPublish.length,
    i.t.duringPublish.length > 0],
  { t: TRAP },
  [0, 0, true],
  'D46: the zeros sit beside the non-empty log they are measured against, so a trap that recorded nothing at all cannot satisfy them. THIS is J02\'s claim — not that readers agree with the camera, but that they never ask it');

pin('B3', 'the clock is read ONCE per publication and nowhere else — `at` is a new read (design.md section 12 row 6), so its cardinality is the whole of its cost',
  (i) => {
    const before = CLOCK.reads;
    const f1 = publishOn(i.make, makeScene(i.spec), NO_BLEND);
    const one = CLOCK.reads - before;
    const readBack = [f1.at, f1.seq, f1.cameraPose.az].length;
    return [one, CLOCK.reads - before, f1.at, readBack];
  },
  { make: PUB.createFramePublisher, spec: { pos: [1, 1, 1], target: [0, 0, 0] } },
  [1, 1, 1000, 3],
  'boundaries.md section B.1: `at` is performance.now() for this frame, READ ONCE. Reading the member again is free, which is the point of publishing it');

pin('B4', 'J-H4 — the publication is JOURNEY-SCOPED: the accessor answers null before the journey has published anything, and never a stale value from another publisher',
  (i) => {
    const a = i.make(i.sceneA);
    const b = i.make(i.sceneB);
    const before = [a.frame(), b.frame()];
    const fa = a.publish({ ...SPINE, transition: NO_BLEND });
    return [before, a.frame() === fa, b.frame(), a.frame().seq, b.publish({ ...SPINE, transition: NO_BLEND }).seq];
  },
  { make: PUB.createFramePublisher,
    sceneA: makeScene({ pos: [2, 0, 0], target: [0, 0, 0] }),
    sceneB: makeScene({ pos: [0, 0, 2], target: [0, 0, 0] }) },
  [[null, null], true, null, 1, 1],
  'design.md J-H4: a page-lifetime reader — the annotation rail, the organism\'s trackers, the lens focus projection — runs where no journey exists. Two publishers share no counter and no latest frame, so a second journey cannot inherit a first one\'s frame');

pin('B5', 'THE FRAME IS A SNAPSHOT, NOT A VIEW: moving the camera, the target, the fov, the fog and the viewport after publication changes nothing on the published value, and the NEXT publication sees all of it',
  (i) => {
    const s = makeScene(i.spec);
    const p = i.make(s);
    const first = p.publish({ ...SPINE, transition: NO_BLEND });
    const held = [first.cameraPose.x, first.cameraPose.tx, first.cameraPose.fov,
      first.cameraPose.fogNear, first.viewport.w, first.seq];
    s.camera.position.x = 99;
    s.controls.target.x = 88;
    s.camera.fov = 77;
    s.scene.fog.near = 66;
    VIEW.w = 320;
    const unchanged = [first.cameraPose.x, first.cameraPose.tx, first.cameraPose.fov,
      first.cameraPose.fogNear, first.viewport.w, first.seq];
    const second = p.publish({ ...SPINE, transition: NO_BLEND });
    VIEW.w = 1440;
    return [held, unchanged, [second.cameraPose.x, second.cameraPose.tx, second.cameraPose.fov,
      second.cameraPose.fogNear, second.viewport.w, second.seq]];
  },
  { make: PUB.createFramePublisher, spec: { pos: [4, 2, 0], target: [1, 0, 0], fov: 45, fogNear: 7, fogFar: 20 } },
  [[4, 1, 45, 7, 1440, 1], [4, 1, 45, 7, 1440, 1], [99, 88, 77, 66, 320, 2]],
  'the middle array is the whole claim, and the third is its D46 control: a publisher that had simply stopped reading would satisfy the middle one too');

pin('B6', 'J-H15 — THE FOG IS THE POST-BLEND FOG. A blend that moves fog between two frames is reflected in the next publication, which is what "after stepCamBlend" buys',
  (i) => {
    const s = makeScene(i.spec);
    const p = i.make(s);
    const before = p.publish({ ...SPINE, transition: FLIGHT }).cameraPose;
    s.scene.fog.near = 13.75;
    s.scene.fog.far = 60.3;
    const after = p.publish({ ...SPINE, transition: FLIGHT }).cameraPose;
    return [[before.fogNear, before.fogFar], [after.fogNear, after.fogFar]];
  },
  { make: PUB.createFramePublisher, spec: { pos: [0, 3, 6], target: [0, 0, 0], fogNear: 7, fogFar: 20 } },
  [[7, 20], [13.75, 60.3]],
  'journey.js records the measurement this hazard is named for: the Mission pose rendered 3.6/255 brighter the instant a click landed, because the fog went to the destination ramp while the camera stood still. 7 -> 20 is the hero\'s ramp and 13.75 -> 60.3 the epilogue\'s, verbatim from that block');

/* ------------------------------------------------------------------ *
 * C — the seam. Static, and declared static.                          *
 * ------------------------------------------------------------------ */
console.log('\nC — the seam: where the publication is taken, and what journey.js stopped reaching for');

pin('C1', 'THE PUBLICATION POINT: exactly one publish() inside applyFrame, below the last camera writer and above the first reader of it',
  (i) => {
    const at = (t) => i.body.indexOf(t);
    return [(i.body.match(/framePublisher\.publish\(/g) || []).length,
      at('stepCamBlend(') < at('framePublisher.publish('),
      at('framePublisher.publish(') < at('seams.update('),
      at('framePublisher.publish(') < at('applyChapterFrame('),
      at('director.apply(') < at('framePublisher.publish(')];
  },
  { body: APPLY_FRAME },
  [1, true, true, true, true],
  'boundaries.md section B.5: after stepCamBlend, before the first reader. Earlier inverts the fog correction B6 measures; later means a reader already went to the live object');

pin('C2', 'D46 / J-H8 — S2 IS BLIND TO THIS, stated as a fixture so nobody cites it as evidence: the frame-order suite\'s token list does not contain the publication, and the same list DOES contain the neighbours it brackets',
  (i) => [/'framePublisher\.publish\(',|'publishFrame\(',/.test(i.fo),
    i.fo.includes("'stepCamBlend(',"), i.fo.includes("'seams.update(',")],
  { fo: SRC.frameOrder },
  [false, true, true],
  'c01/limitations.md\'s recorded miss, arriving exactly where the design predicted. tools/test-frame-order.mjs is outside this order\'s allowlist, so the token was NOT added and S2 is unmoved — a declared deviation, and the reason the runtime proof is section B above and not S2');

pin('C3', 'applyChapterFrame is handed the FRAME\'s gliding, and applyFrame reaches the model for it exactly once — at the publication, above every reader, and nowhere else',
  (i) => [i.body.includes('frame.gliding, guarded)'),
    i.body.split('\n').map((l) => l.trim()).filter((l) => l.includes('scroll.gliding')),
    (i.body.match(/applyChapterFrame\(/g) || []).length,
    (i.fa.match(/\bgliding\b/g) || []).length,
    i.fa.includes('export function applyChapterFrame(chapters, chapterEntry, p, dt, gliding, guarded) {')],
  { body: APPLY_FRAME, fa: read('journey/frame-application.js') },
  [true, ['gliding: scroll.gliding,'], 1, 2, true],
  'E-B2 / J-H7: journey/frame-application.js is the program\'s only executed frame-order evidence and is NOT touched — its signature line and its three `gliding` occurrences are read out of the shipped file. Only the fifth argument\'s EXPRESSION changes, which sequence()\'s applyChapterFrame( token cannot see. The site set is D99: the one surviving model read is named, not counted');

pin('C4', 'the capability is installed on the scene handle exactly once, and journey.js holds no second publisher',
  (i) => [(i.journey.match(/createFramePublisher\(/g) || []).length,
    (i.journey.match(/sceneApi\.frame = /g) || []).length,
    (i.journey.match(/framePublisher\./g) || []).length],
  { journey: stripComments(SRC.journey, { blankStrings: true }) },
  [1, 1, 2],
  'one construction, one installation, and two reaches: the install and the publish. A second publisher would mean two frame counters and two answers to sceneApi.frame()');

/* ------------------------------------------------------------------ *
 * C8..C10 — D1, 2026-08-25: THE CONSUMERS, ROUTED.                     *
 *                                                                      *
 * J02 built the value and C1..C4 pinned where it is taken. What was    *
 * missing was a statement about the READERS: every one of them still   *
 * took its coordinate off a live local in the same frame the frozen    *
 * publication of that coordinate existed, and "the frame is the        *
 * authority" was again a property of statement order alone — the exact *
 * fault the publication's own header names ("correct today, and        *
 * silently reversible by any edit that moves a writer down or a reader *
 * up"). C8 makes it a property of the TEXT, with the surviving live    *
 * reaches enumerated rather than tolerated; C9 makes "which time       *
 * coordinate am I in?" answerable with one `seq`; C10 makes the wrap's *
 * no-monotone-coordinate exception a FIELD a reader can consult from   *
 * the frame alone.                                                     *
 * ------------------------------------------------------------------ */

/** applyFrame BELOW the publication — the reader block, comment- and
 *  string-blanked, sliced from the shipped text at the publish call's own
 *  closing brace. A miss is a fault, never a silently empty region (D45). */
const READER_REGION = (() => {
  const at = APPLY_FRAME.indexOf('framePublisher.publish(');
  if (at < 0) fault('C8: ANCHOR MISS on framePublisher.publish( inside applyFrame');
  const close = APPLY_FRAME.indexOf('});', at);
  if (close < 0) fault('C8: ANCHOR MISS on the publish call\'s closing });');
  const region = APPLY_FRAME.slice(close + 3);
  if (!region.includes('ui.update(')) fault('C8: the sliced region does not reach ui.update( — the slice is wrong');
  return region;
})();

/** The four loose coordinate names, counted as READS. `travelP` is matched
 *  with a negative lookahead on `:` so the ui opts-bag KEY — which is a
 *  parameter name journey.js does not own — is not counted as a read of the
 *  retired local. */
const LOOSE = Object.freeze({
  frameP: /\bframeP\b(?!\s*:)/g,
  travelP: /\btravelP\b(?!\s*:)/g,
  p: /(?<![.\w$])p\b(?!\s*:)/g,
  dt: /(?<![.\w$])dt\b(?!\s*:)/g,
});
const looseCounts = (region) => Object.entries(LOOSE)
  .map(([n, re]) => `${n}:${(region.match(re) || []).length}`);
/** Every reach into LIVE state from the reader block. The readers themselves
 *  (`lens.`, `seams.`, `ui.`) are the things being DRIVEN, not state being
 *  consulted, so they are not in the scan; this set is the RESIDUE the
 *  routing could not retire.
 *
 *  THE SCAN IS WIDER THAN THE RESIDUE ON PURPOSE. Two of the seven names
 *  below (`transition`, `sceneApi`) are all that survive today, but the
 *  failure this pin exists to catch is a reader that takes the frozen frame
 *  and then reaches for SOMETHING live — and the next such reach will not
 *  necessarily be the controller. `scroll` is named because C3 records the
 *  one that already happened (`scroll.gliding`, read halfway down the reader
 *  list, until J02 made it a member); `journey`, `director`, and the four
 *  page globals are named because they are the live objects this function's
 *  scope can actually see. A name that is not on this list is a hole, and
 *  the honest statement of the pin's reach is this list. */
const LIVE_ROOTS = /\b(?:transition|sceneApi|scroll|journey|director|window|globalThis|document|performance|location|history)\.\w+/g;
const liveReaches = (region) => [...new Set(region.match(LIVE_ROOTS) || [])].sort();

pin('C8', 'BELOW THE PUBLICATION, NOT ONE OF THE FOUR LOOSE COORDINATE NAMES IS READ AGAIN — thirteen reads come off the frozen frame instead, over five of its members',
  (i) => [looseCounts(i.region),
    [...new Set((i.region.match(/\bframe\.\w+/g) || []).map((s) => s.slice(6)))].sort(),
    (i.region.match(/\bframe\.\w+/g) || []).length],
  { region: READER_REGION },
  [['frameP:0', 'travelP:0', 'p:0', 'dt:0'],
    ['dt', 'gliding', 'presentedP', 'routeP', 'stateP'], 13],
  'D54: the four zeros stand beside a NON-EMPTY set the same scan found in the same call — thirteen frame reads over five members — so a slice that went blind reports 0 against 13 rather than four clean zeros that mean nothing. This is the acceptance criterion as a property of the TEXT: the frozen frame is not merely available to the readers, it is the only thing they read');

pin('C9', 'THE LIVE REACHES THAT SURVIVE ARE ENUMERATED, NOT TOLERATED: exactly seven, each named, and an eighth is a red',
  (i) => [liveReaches(i.region), liveReaches(i.region).length, i.region.includes('ui.update(')],
  { region: READER_REGION },
  [['sceneApi.camera', 'transition.cameraStateDisagree', 'transition.chapterEntry',
    'transition.railFlight', 'transition.railWrap', 'transition.stepHeroEntry',
    'transition.stepHeroExit'], 7, true],
  'THE SEVEN SURVIVORS ARE THE FINDING, not the residue. `sceneApi.camera` because ui.js binds a PROJECTION from it and boundaries.md B.8 forbids the publication carrying one (C5 pins the file-level allow-list this respects). `railWrap`/`railFlight` because journey/rail.js and journey/ui/copy-arrival.js compare those tickets BY IDENTITY and read `phase` as it mutates — a frozen copy would stop the rail docking and the copy carry from tracking the lap, which is why the publisher\'s own header refuses them. `cameraStateDisagree` because it is NOT the same value as frame.transitionPhase.disagree: beginFlight() raises the flag BEFORE beginBlend() exists and placeAt() publishes two dt=0 frames in that window, on which phaseOf() answers null — so routing it through the frame would move rail.js\'s `jumpStarted` edge by two frames. `chapterEntry` and the two hero steppers are the controller\'s own per-frame steppers, called rather than read. The third element is the D45 half: a slice that stopped short of ui.update() would find few reaches and look clean. The SCAN is wider than the seven — see LIVE_ROOTS — because the next reader to reach for something live need not reach for the controller');

pin('C10', 'ONE ANSWER PER FRAME, WITH A SEQ ON IT: the coordinate members and the seq come off ONE object, the accessor hands back that same object by identity, and a frame already published never learns a later frame\'s number',
  (i) => {
    const p = i.make(makeScene({ pos: [1, 2, 3], target: [0, 0, 0] }));
    const a = p.publish({ dt: 0.016, stateP: 0.10, routeP: 0.11, presentedP: 0.12, transition: FLIGHT, gliding: true });
    const heldA = p.frame();
    const b = p.publish({ dt: 0.033, stateP: 0.20, routeP: 0.21, presentedP: 0.22, transition: WRAP, gliding: false });
    const c = p.publish({ dt: 0.008, stateP: 0.30, routeP: 0.31, presentedP: 0.32, transition: NO_BLEND, gliding: true });
    const tuple = (f) => `${f.seq}|${f.stateP}/${f.routeP}/${f.presentedP}/${f.dt}`;
    return [
      // the numbers a reader gets, per frame, with the frame's own seq on them
      [tuple(a), tuple(b), tuple(c)],
      // ...and re-reading the FIRST frame after two more have been published
      // still answers the first frame's number, because it is a value
      tuple(a),
      // the accessor is the same object, not a copy that could drift
      [heldA === a, p.frame() === c, p.frame() === a],
      // strictly one increment per publish, from this publisher's own zero
      [c.seq - b.seq, b.seq - a.seq, a.seq],
    ];
  },
  { make: PUB.createFramePublisher },
  [['1|0.1/0.11/0.12/0.016', '2|0.2/0.21/0.22/0.033', '3|0.3/0.31/0.32/0.008'],
    '1|0.1/0.11/0.12/0.016',
    [true, true, false],
    [1, 1, 1]],
  'this is the acceptance criterion stated as a value: "which time coordinate am I in?" has ONE answer per frame and the answer is stamped. The third element\'s `false` is the D46 half — an accessor that answered the FIRST frame forever would satisfy the identity check and fail here');

pin('C11', 'THE WRAP EXCEPTION IS A FIELD, NOT A PARALLEL TICKET: a reader holding ONLY the frame answers "is there a monotone section coordinate this frame?" exactly as the controller\'s own ticket does, on five transition shapes including a FORWARD wrap',
  (i) => {
    /* The frame-only reader. It is written here, in the pin, precisely
       because that is the claim: the published value carries enough to
       answer without reaching into the controller. */
    const fromFrame = (f) => !(f.transitionPhase && f.transitionPhase.kind === 'wrap');
    /* ...and the oracle is the controller's own state, which is what
       journey.js's directJumpTo branches on today (`if (wrap)`). */
    const fromController = (t) => !t.railWrap;
    const shapes = { NO_BLEND, WRAP, WRAP_FWD, FLIGHT, BARE };
    const rows = Object.entries(shapes).map(([n, t]) => {
      const f = publishOn(i.make, i.scene, t);
      return `${n}:${f.transitionPhase ? f.transitionPhase.kind : 'null'}:${fromFrame(f) === fromController(t)}`;
    });
    return [rows, rows.filter((r) => r.endsWith(':true')).length, rows.length];
  },
  { make: PUB.createFramePublisher, scene: makeScene({ pos: [2, 2, 2], target: [0, 0, 0] }) },
  [['NO_BLEND:null:true', 'WRAP:wrap:true', 'WRAP_FWD:wrap:true',
    'FLIGHT:flight:true', 'BARE:blend:true'], 5, 5],
  'journey.js states the exception in prose — "a cyclic wrap has no monotone section coordinate across its hidden seam" — and then spends it as two click-time arm calls. The PROPERTY it names is now readable per frame off `transitionPhase.kind`. WRAP_FWD is the row that makes this non-vacuous: it is a wrap with `play` +1, so a `kind` keyed off the blend\'s DIRECTION rather than off the ticket agrees with the oracle on WRAP and disagrees here');

/** `code()` is tools/test-frame-order.mjs's own comment/string filter, taken
 *  from the SHARED module it was lifted into rather than re-derived here. */
const code = (s) => stripComments(s, { blankStrings: true });

/** Every .js under the roots, as paths. The scan set comes off the disk
 *  (D94), so a file that lands tomorrow is scanned tomorrow. */
function jsFilesUnder(roots) {
  const out = [];
  for (const root of roots) {
    const abs = join(REPO, root);
    if (statSync(abs).isFile()) { if (root.endsWith('.js')) out.push(root); continue; }
    for (const f of readdirSync(abs, { recursive: true })) {
      if (typeof f === 'string' && f.endsWith('.js')) out.push(`${root}/${f}`);
    }
  }
  return out.sort();
}

const CAMERA_ROOTS = ['journey', 'organism/furniture.js', 'main.js'];
const SCANNED = jsFilesUnder(CAMERA_ROOTS);
const NAMING_CAMERA = SCANNED.filter((f) => /\bcamera\b/.test(code(read(f))));

pin('C5', 'E-B3 — the FILE-level allow-list. Thirteen files name the camera in code: the design\'s eleven, plus the TWO publication owners whose whole job is to name it once',
  (i) => [i.naming, i.naming.length, i.scanned.length,
    i.naming.includes('main.js'), i.naming.includes('organism/furniture.js')],
  { naming: NAMING_CAMERA, scanned: SCANNED },
  [['journey/camera-blend.js', 'journey/chapters/connect/index.js',
    'journey/chapters/equip/index.js',
    'journey/chapters/final/index.js', 'journey/chapters/final/interact.js',
    'journey/chapters/inspire/index.js', 'journey/chapters/owned/index.js',
    'journey/director.js', 'journey/frame/publication.js', 'journey/journey.js',
    'journey/lens.js', 'journey/seams.js', 'journey/ui.js',
    'journey/ui/frame-projection.js'],
    /* RE-BASELINED 103 -> 104 by order J04e, 2026-08-22.
       WAS (pre-J04e): 12, 103, false, false.
       The scan set comes off the disk, so every new .js under `journey/`
       moves this number. J04e added journey/journey-owner.js, which names
       no camera — the HIT LIST above is byte-identical and that is the
       half of this pin that carries the invariant. The cardinality is
       pinned beside it so a scan that read nothing reports 0/0, and this
       is the arithmetic that keeps it honest.

       RE-BASELINED 104 -> 105 by order U01b, 2026-08-22, on J04e's exact
       precedent and for the same reason. WAS (pre-U01b): 12, 104, false,
       false. U01b added journey/cards/registry.js — the card builder
       registry's owner, lifted out of journey/cards/index.js — which names
       no camera. THE HIT LIST ABOVE IS BYTE-IDENTICAL: the suite's own
       failure output printed expected and actual hit lists that differ in
       not one character, and the scanned cardinality was the only cell that
       moved. Verified independently that the delta is exactly one file:
       re-running this pin's own `jsFilesUnder(CAMERA_ROOTS)` gives 105 with
       registry.js and 104 without it, and `/\bcamera\b/` does not match its
       source. Evidence: docs/code-health/evidence/2026-08-21-elegance-run-01/
       u01b/c5-scanned-delta.txt.

       NOTE FOR THE COORDINATOR: this file is not on U01b's allowlist. The
       edit is one token plus this comment, it follows the protocol this pin
       documents for itself, and the alternative was handing U01c/U01d a red
       tree with a defect that is not theirs. Reverse it in one token if that
       call was wrong.

       RE-BASELINED 105 -> 106 by order U01c, 2026-08-22, on the same protocol
       and for the same reason. WAS (pre-U01c): 12, 105, false, false. U01c
       added journey/cards/icons.js — the card chip glyph data, lifted out of
       journey/cards/index.js — which names no camera. THE HIT LIST ABOVE IS
       BYTE-IDENTICAL: the suite's own failure output printed expected and
       actual hit lists that differ in not one character, and the scanned
       cardinality was the only cell that moved. Verified independently that
       the delta is exactly one file: this pin's own `jsFilesUnder(CAMERA_ROOTS)`
       gives 106 with icons.js and 105 without it, and `/\bcamera\b/` does not
       match its source. Evidence: docs/code-health/evidence/
       2026-08-21-elegance-run-01/u01c/c5-scanned-delta.txt.

       NOTE FOR THE COORDINATOR: this file is on U01c's allowlist (D124 was
       recorded between U01b and U01c, and the allowlist anticipated all three
       pins this time).

       RE-BASELINED 106 -> 107 by order U02, 2026-08-22, on the same protocol
       and for the same reason. WAS (pre-U02): 12, 106, false, false. U02 added
       journey/ui/hot-state.js — the hotspot/hover-zone registry and hot-state
       owner, lifted out of journey/ui.js — which names no camera. THE HIT LIST
       ABOVE IS BYTE-IDENTICAL: this pin's own `jsFilesUnder(CAMERA_ROOTS)`
       gives 107 with hot-state.js and 106 without it, the two `/\bcamera\b/`
       hit lists compare byte-equal, and the regex does not match its source.
       Evidence: docs/code-health/evidence/2026-08-21-elegance-run-01/u02/
       c5-scanned-delta.txt. This file is on U02's allowlist.

       RE-BASELINED 107 -> 110 by order U03, 2026-08-22, on the same protocol
       and for the same reason. WAS (pre-U03): 12, 107, false, false. U03 added
       journey/ui/{popover-tier,card-tier,selection}.js — the two disclosure
       vessels and the owner of the selected light, the committed disclosure and
       the focus return, all lifted out of journey/ui.js. NONE OF THE THREE
       NAMES A CAMERA, and THE HIT LIST ABOVE IS BYTE-IDENTICAL: the allow-list
       cell is still the same twelve files in the same order, and only the
       scanned cardinality moved, by exactly the three files this order created.
       Evidence: docs/code-health/evidence/2026-08-21-elegance-run-01/u03/
       c5-scanned-delta.txt.

       NOTE FOR THE COORDINATOR: this file is NOT on U03's allowlist. It is
       taken on D124's disclosed-excursion precedent (U01b), which anticipates
       that every order creating a module under journey/ moves this pin by
       construction. One token; reversible in one token.

       RE-BASELINED 110 -> 111 by order U04, 2026-08-22, on the same protocol
       and for the same reason. WAS (pre-U04): 12, 110, false, false. U04 added
       journey/ui/copy-arrival.js — the copy choreography and the arrival
       envelope, lifted out of journey/ui.js. IT NAMES NO CAMERA IN CODE, and
       THE HIT LIST ABOVE IS BYTE-IDENTICAL: this pin's own
       `jsFilesUnder(CAMERA_ROOTS)` gives 111 with copy-arrival.js and 110
       without it, the two `/\bcamera\b/` hit lists are the same twelve files in
       the same order, and the regex does not match the new file's code.

       It DOES match its header prose ("once the camera has settled"), which is
       why the evidence probe runs the pin's own `code()` stripper rather than
       a raw read — the first draft of that probe tested raw source, reported a
       hit, and would have blocked a re-baseline that the protocol in fact
       allows. Recorded because a control that measures a wider subject than
       its claim is D46's failure in the direction that merely wastes time.
       Evidence: docs/code-health/evidence/2026-08-21-elegance-run-01/u04/
       c5-scanned-delta.txt.

       NOTE FOR THE COORDINATOR: this file is NOT on U04's allowlist either,
       and is taken on the same D124 precedent. One token; reversible in one
       token.

       RE-BASELINED 111 -> 113 by order U05, 2026-08-22, on the same protocol
       and for the same reason. WAS (pre-U05): 12, 111, false, false. U05 added
       journey/layout/rail-geometry.js — the rail's one measurement owner — and
       journey/ui/card-layout.js — the card's projection, collision and
       placement ladder, lifted out of journey/ui.js. NEITHER NAMES A CAMERA IN
       CODE, and THE HIT LIST ABOVE IS BYTE-IDENTICAL: the suite's own failure
       output printed the same twelve files in the same order and only the
       scanned cardinality moved, by exactly the two files this order created.
       This pin's own `jsFilesUnder(CAMERA_ROOTS)` gives 113 with them and 111
       without, and the probe runs the pin's own `code()` stripper on U04's
       recorded precedent. Evidence: docs/code-health/evidence/
       2026-08-21-elegance-run-01/u05/c5-scanned-delta.txt.

       WORTH RECORDING FOR U06: card-layout.js does not name a camera BY
       DESIGN, not by luck. `journey/ui.js` publishes its per-frame geometry
       with the projection already bound to the settled camera, so the layout
       module receives a projection and cannot grow a second camera reader.
       That is the shape that keeps this hit list at twelve while ui.js keeps
       shrinking.

       U06 TOOK THAT SHAPE UP, AND IT COST THE LIST EXACTLY ONE FILE.
       RE-BASELINED 12 -> 13 hits and 113 -> 118 scanned, 2026-08-23.

       U06 created five UI owners, and on the first draft FOUR of them took a
       `camera` parameter — `hotspot-frame.js`, `rail-mask.js`,
       `hover-zone.js` and `frame-projection.js` — which took this list to
       sixteen. That is a design boundary being widened by four to suit one
       order's layering, and bumping the literal would have been exactly the
       repair D54 says a number invites and a manifest refuses.

       So the code changed instead, along the line the U05 note above
       predicted: `journey/ui/frame-projection.js` publishes a FROZEN snapshot
       carrying `project(v)` and `projectRaw(v)` with the camera already bound,
       and the other three owners take that snapshot. They receive projections
       and cannot grow a camera reader, exactly as card-layout.js cannot.

       ONE file is added and it is the publisher itself — the file whose whole
       job is to name the camera once, which is the same justification the
       headline already carries for `journey/frame/publication.js`. The
       remaining `camera` occurrences in the other three owners are PROSE, and
       C6 below is the control proving this scan does not count prose.

       The scanned cardinality moves 113 -> 118 by exactly the five files U06
       created, none of which existed before it. Evidence:
       docs/code-health/evidence/2026-08-21-elegance-run-01/u06/
       c5-scanned-delta.txt.

       NOTE FOR THE COORDINATOR: this file IS on U06's allowlist (one of the
       three cardinality-pin suites). One token; reversible in one token.

       RE-BASELINED 118 -> 122 scanned by order B01, 2026-08-23, on this
       pin's own protocol. WAS (pre-B01): 13, 118, false, false.

       B01 added four modules under journey/boot/ — scene-note.js,
       hero-mode.js, entry-queue.js and handoff.js — out of main.js. THE HIT
       LIST ABOVE IS BYTE-IDENTICAL and the two `false` cells are unmoved,
       which is the half of this pin that carries the invariant: NONE of the
       four names the camera in code, and main.js still does not.

       That last clause is the one that needed proving rather than hoping,
       because hero-mode.js is where main.js's responsive CAMERA compositions
       went — `VIEWS`, the Mission truck and the per-mode world anchors, a
       region whose prose says "camera" a dozen times. It says it in prose
       only: the code spells the fields `camY`, `camZ`, `panX`, `targetY`,
       `fov`, and `\\bcamera\\b` does not match `camY`. C6 below is the
       control that this scan reads code and not prose, and this move is the
       first time that distinction has been load-bearing for a FILE rather
       than for a line. Verified by re-running this pin's own
       `jsFilesUnder(CAMERA_ROOTS)`: 122 with the four, 118 without, and the
       naming set 13 either way. Evidence:
       docs/code-health/evidence/2026-08-21-elegance-run-01/b01/
       c5-scanned-delta.txt.

       RE-BASELINED 124 -> 126 at the 2026-08-28 release wave, on the same
       protocol and for the same reason. X3 names the exact two new modules:
       journey/layout/final-composition.js, the shared pixel/world geometry
       policy for Final and its Purpose navigator, and
       journey/navigation-timing.js, the button-route duration policy consumed
       at journey.js's existing camera-flight seam. Neither names `camera` in
       CODE: final-composition's exported identifier `cameraWorldUnitsForPixels`
       contains no standalone word and both files' prose is stripped by this
       pin's own code() reader. The thirteen-file naming allow-list above and
       both exclusion booleans are byte-identical; only the disk-derived scan
       cardinality moved by the two accepted files. */
    /* RE-BASELINED 13 -> 14 files and 126 -> 128 scanned at the 2026-08-30
       Equip wave. The two new files are journey/chapters/equip/camera.js,
       which names no `camera` in CODE (it is a leg of poses, and its prose is
       stripped by this pin's own code() reader), and journey/chapters/equip/
       index.js, which DOES: it reads `sceneApi.camera` once, in `entryReady`,
       to answer "is the eye under the cap yet" as a camera-pure predicate —
       the same shape and the same justification as the four chapter modules
       already on this list. It is a chapter naming the camera to gate its own
       reveal, which is precisely what boundaries.md section B.7 admits. */
    /* SCAN CARDINALITY 128 -> 129 at order R11, 2026-09-01. ONE file:
       journey/hero-field.js, the adopted hero spore field's presence gate.
       It names NO camera in code — it reads one geometry attribute off a
       handle it is given (`sceneApi.groups.heroField`) and multiplies it, and
       it holds no pose, no projection and no THREE object — so the
       fourteen-file naming allow-list above and both exclusion booleans are
       BYTE-IDENTICAL. Only the disk-derived scan cardinality moved, by the
       one accepted file, which is the number this pin carries precisely so
       that a scan which quietly stopped reading files reports a shrunken
       denominator instead of a clean list. */
    14, 129, false, false],
  'boundaries.md section B.7 pins 11 and the two publication owners are named. main.js and organism/furniture.js are in the SCANNED roots and in neither list — section B.6a\'s reclassification, and the scan is what keeps it true. The scanned cardinality is pinned beside the hits so a scan that read nothing reports 0/0 rather than a clean 12');

pin('C6', 'D46 — the camera scan DOES see a code mention and does NOT see a prose one, which is the whole difference between 11 and the raw grep\'s 44',
  (i) => [/\bcamera\b/.test(i.code('const c = sceneApi.camera;')),
    /\bcamera\b/.test(i.code('// the camera stays outside the rim on the Connect leg')),
    /\bcamera\b/.test(i.code('/* a camera-keyed rise mask */')),
    /\bcamera\b/.test(i.code("const s = 'camera';"))],
  { code },
  [true, false, false, false],
  'boundaries.md section B.7 measured this three ways and got 44 / 9 / 11. Without this fixture the 12 above is a number with no stated meaning');

pin('C7', 'THE VENDORED THREE IS A RESOLVABLE EDGE: this suite imports the very file madge.webpack.cjs\'s `three$` alias points at, and names no bare `three` anywhere',
  (i) => [i.alias.test(i.madge),
    i.code.includes("await import('../vendor/three/three.module.js')"),
    (i.code.match(i.bare) || []).length,
    statSync(join(REPO, 'vendor/three/three.module.js')).isFile()],
  { madge: read('madge.webpack.cjs'),
    code: stripComments(SRC_SELF, { blankStrings: false }),
    alias: /three\$:\s*path\.resolve\(__dirname,\s*'vendor\/three\/three\.module\.js'\)/,
    bare: new RegExp(`from '${'thr'}${'ee\''}|import\\('${'thr'}${'ee\''}\\)`, 'g') },
  [true, true, 0, true],
  'tools/check-cycles.mjs: `three` is VENDORED, so it must never join DECLARED_EXTERNALS — that list is for genuine npm packages and an entry there hides a real edge. A bare specifier from a tools/*.mjs file is unresolvable to madge; this row is what keeps the two paths the same file. The bare-specifier pattern is assembled from fragments so this row does not count itself');

/* ------------------------------------------------------------------ *
 * D — THE ORACLE. The pre-computed members, against the shipped        *
 *     derivations sliced out of three other files.                     *
 * ------------------------------------------------------------------ */
console.log('\nD — the oracle: az, r and fwdY against the derivations already in the tree');

/** The grid. Four poses whose az and r are exact by hand, plus one whose
 *  radius is the 3-4-5 integer. Every one of them is a place the camera can
 *  actually be: on the axis, behind, to the side, and out on the rim. */
const GRID = [
  { name: 'behind', pos: [0, 5, -2], target: [0, 0, 0] },
  { name: 'right', pos: [1, 0, 0], target: [0, 0, 0] },
  { name: 'left', pos: [-1, 2, 0], target: [0, 0, 0] },
  { name: 'front', pos: [0, 0, 3], target: [0, 0, 0] },
  { name: 'rim', pos: [3, 2, 4], target: [0, 1, 0] },
];

/* The right-hand side of the oracle: the SHIPPED derivations, sliced out of
   the files that already do them and executed. Three files, three authors,
   one law — which is what makes this a comparison rather than a restatement
   of the publisher's own formula. */
const DERIVATIONS = {
  directorAz: lineWith('director', SRC.director, 'hero.az = Math.atan2(camera.position.x, camera.position.z);'),
  directorR: lineWith('director', SRC.director, 'hero.r = Math.hypot(camera.position.x, camera.position.z);'),
  seamsAz: lineWith('seams', SRC.seams, 'const az = Math.atan2(x, z);'),
  connectR: lineWith('connect', SRC.connect, 'const camRad = Math.hypot(cam.x, cam.z);'),
  connectFwd: lineWith('connect', SRC.connect, 'sceneApi.camera.getWorldDirection(_fwd);'),
};

/** Run the four shipped derivations over one scene, each compiled from the
 *  text above. A miss on any anchor has already faulted. */
function shippedDerivation(scene) {
  const fn = new Function('sceneApi', 'THREE', `
    const camera = sceneApi.camera, controls = sceneApi.controls;
    const hero = { az: 0, r: 0 };
    ${DERIVATIONS.directorAz}
    ${DERIVATIONS.directorR}
    let seamsAz, connectR, fwdOut;
    { const { x, y, z } = camera.position; ${DERIVATIONS.seamsAz} seamsAz = az; }
    { const cam = camera.position; ${DERIVATIONS.connectR} connectR = camRad; }
    { const _fwd = new THREE.Vector3(); ${DERIVATIONS.connectFwd} fwdOut = [_fwd.x, _fwd.y, _fwd.z]; }
    return { az: hero.az, r: hero.r, seamsAz, connectR, fwd: fwdOut };
  `);
  return fn(scene, THREE);
}

const ORACLE = GRID.map((g) => {
  const scene = makeScene(g);
  const pose = publishOn(PUB.createFramePublisher, scene, NO_BLEND).cameraPose;
  const shipped = shippedDerivation(scene);
  return {
    name: g.name,
    azSame: pose.az === shipped.az && pose.az === shipped.seamsAz,
    rSame: pose.r === shipped.r && pose.r === shipped.connectR,
    fwdSame: pose.fwdX === shipped.fwd[0] && pose.fwdY === shipped.fwd[1] && pose.fwdZ === shipped.fwd[2],
    az: pose.az,
    r: pose.r,
  };
});

pin('D1', 'THE PUBLISHED az, r AND FORWARD ARE THE SAME DOUBLES the director, the seams and Connect derive today — every cell of the grid, exactly equal, no tolerance',
  (i) => [i.o.map((c) => `${c.name}:${c.azSame}/${c.rSame}/${c.fwdSame}`),
    i.o.filter((c) => c.azSame && c.rSame && c.fwdSame).length,
    i.o.length],
  { o: ORACLE },
  [['behind:true/true/true', 'right:true/true/true', 'left:true/true/true',
    'front:true/true/true', 'rim:true/true/true'], 5, 5],
  'boundaries.md section B.2: az and r are pre-computed because four call sites duplicate the derivation, and "Math.atan2 on the same two doubles is the same double". This is that sentence, executed against the call sites themselves rather than against a copy of their formula');

pin('D2', 'D46 / Engine 3 — the grid is not vacuous: the four exact poses land on the angles HAND-DERIVED BEFORE THE COMPARISON, and the fifth on the 3-4-5 radius',
  (i) => [i.o.map((c) => c.az), i.o.map((c) => c.r)],
  { o: ORACLE },
  [[3.141592653589793, 1.5707963267948966, -1.5707963267948966, 0, 0.6435011087932844],
    [2, 1, 1, 3, 5]],
  'atan2(0,-2) is pi; atan2(1,0) is pi/2; atan2(-1,0) is -pi/2; atan2(0,3) is 0; atan2(3,4) is arctan(3/4). The radii are hypot(0,-2)=2, hypot(1,0)=1, hypot(-1,0)=1, hypot(0,3)=3 and the 3-4-5 hypotenuse. An agreement over a grid that only ever saw one angle would agree vacuously');

pin('D3', 'A0 CONTROL — the publisher compiled out of its own text is the SAME publisher: identical poses and identical phases on every cell of the grid and on all four transition shapes',
  (i) => {
    const strip = (f) => ({ ...f, at: 'clock', seq: 'seq' });
    const cells = [];
    for (const g of GRID) {
      for (const [n, t] of Object.entries({ NO_BLEND, WRAP, FLIGHT, BARE })) {
        const a = strip(publishOn(i.imported, makeScene(g), t));
        const b = strip(publishOn(i.compiled, makeScene(g), t));
        cells.push(`${g.name}/${n}:${JSON.stringify(a) === JSON.stringify(b)}`);
      }
    }
    return [cells.filter((c) => !c.endsWith(':true')), cells.length];
  },
  { imported: PUB.createFramePublisher, compiled: compilePublisher(SRC.publication) },
  [[], 20],
  'without this row every text mutant below would be mutating a text nobody ships. The zero carries its own cardinality, so a loop that ran zero cells cannot satisfy it');

pin('D4', 'THE TRANSITION, PROJECTED — a wrap, a flight, no blend, and the shape the shipped route never produces, each answered from the controller\'s own recorded fields rather than reconstructed',
  (i) => [NO_BLEND, WRAP, FLIGHT, BARE].map((t) => {
    const ph = publishOn(i.make, i.scene, t).transitionPhase;
    return ph === null ? 'null' : `${ph.kind}/${ph.play}/${ph.e}/${ph.fromP}/${ph.targetP}/${ph.disagree}`;
  }),
  { make: PUB.createFramePublisher, scene: makeScene({ pos: [2, 2, 2], target: [0, 0, 0] }) },
  ['null', 'wrap/-1/0.25/0.42/0/true', 'flight/1/0.5/0.1/0.65/true', 'blend/1/0/0.2/0.3/false'],
  'the last cell is the DEFAULT PAIR the shipped route never reaches — directJumpTo always installs exactly one rail ticket and dropCamBlend clears blend and both together — exercised here rather than left as an untested else (D75)');

/* ------------------------------------------------------------------ *
 * E — the manifest entry.                                             *
 * ------------------------------------------------------------------ */
console.log('\nE — the source manifest');

/* RE-BASELINED by order J04e, 2026-08-22, and the pin is WIDENED rather than
   weakened. WAS (pre-J04e): a match of
   `"journey/frame-application.js" , "([^"]+)" , "journey/journey.js"`
   expecting the single capture `journey/frame/publication.js`.
   J04e's journey/journey-owner.js sorts BETWEEN publication.js and
   journey.js — '-' (0x2D) is below '.' (0x2E) — so the one-entry window no
   longer holds and the old reader answered NOT ADJACENT. The window is now
   the ordered FOUR, which says everything the old one said and also names
   the new neighbour, so a later insertion anywhere in the run reds it
   exactly as before. J04e added its own row and moved nobody else's (D62);
   E2 below is unmoved and still pins that this order added exactly one
   journey/frame entry.

   WIDENED AGAIN, and again rather than weakened, by order R11 2026-09-01.
   journey/hero-field.js sorts BETWEEN frame/publication.js and
   journey-owner.js ("frame/..." < "hero-field.js" < "journey-owner.js" on
   'f' < 'h' < 'j'), so the ordered FOUR no longer holds and this reader
   answered NOT ADJACENT — which is the pin doing its job, not a fault in
   it. The window is now the ordered FIVE: it still says everything the
   four said, in the same order, and additionally names the new neighbour,
   so a later insertion anywhere in the run reds it exactly as before.
   R11 added its own row and moved nobody else's (D62); E2 below is
   unmoved and still pins that. */
pin('E1', 'X3 — journey/frame/publication.js is in the source manifest, in its NAMED neighbourhood: frame-application.js before it, and hero-field.js then journey-owner.js then journey.js after',
  (i) => {
    const m = i.src.match(/"journey\/frame-application\.js",\s*\n\s*"([^"]+)",[\s\S]*?"([^"]+)",\s*\n\s*"([^"]+)",\s*\n\s*"journey\/journey\.js",/);
    return m ? [m[1], m[2], m[3]] : 'NOT ADJACENT';
  }, { src: SRC.baseline },
  ['journey/frame/publication.js', 'journey/hero-field.js', 'journey/journey-owner.js']);

pin('E2', 'X3 — this order added exactly one manifest entry and touched nobody else\'s',
  (i) => (i.src.match(/"journey\/frame\/[a-z-]+\.js",/g) || []).length,
  { src: SRC.baseline }, 1);

/* ------------------------------------------------------------------ *
 * F — this suite, audited (D44 / D76 / D86).                          *
 * ------------------------------------------------------------------ */
console.log('\nF — this suite, audited');

const PIN_TOKEN = maskedToken('p' + 'in');
const LIT_RE = literalPredicateRe(['L.same', PIN_TOKEN.whole], 2);
const LIT = literalPredicateHits(SRC_SELF, LIT_RE);
L.same('F1', 'D44 — bare-literal-predicate assertions in this suite', LIT.hits.length, 0,
  LIT.hits.join('\n        '));
L.same('F2', 'D46 — control: the D44 pattern DOES fire on a bare literal',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', true);"), true);
L.same('F3', 'D46 — control: it does NOT fire on a real comparison',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', a.length, 3);"), false);
L.same('F4', 'D45 — the D44 scan read this whole file, not a fragment', LIT.lineCount > 300, true);
L.same('F5', 'D76 — this self-scan MASKS its own token, so its stored rows are not occurrences it counts',
  [PIN_TOKEN.whole.length, SRC_SELF.includes("maskedToken('p' + 'in')")], [3, true]);

const TAUT = scanTautologyAst(SRC_SELF, new Map([['L.same', 2], [PIN_TOKEN.whole, PIN_RECEIVER]]));
L.same('F6', 'D86 — syntactic tautologies in this suite', TAUT.hits, [], TAUT.hits.join('\n        '));
L.same('F7', 'D86 — the AST pass reached this suite\'s call sites (a zero means the scan went blind, not that the file is clean)',
  [TAUT.sites > 0,
    TAUT.sites === REGISTRY.size + selfSiteSet('x', SRC_SELF, /(?:^|[^.\w$])L\.same\(/, null).length],
  [true, true]);
L.same('F8', 'D86 — control: the pass DOES fire on the shape a text scan cannot see',
  scanTautologyAst("L.same('X', 'what', 8, 8);", new Map([['L.same', 2]])).hits.length, 1);
L.same('F9', 'D76 — pin() call sites counted in this file equal the registry size',
  selfSiteSet('tools/test-frame-publication.mjs', SRC_SELF,
    new RegExp(`^${PIN_TOKEN.head}${PIN_TOKEN.tail}\\(`), PIN_TOKEN.whole).length, REGISTRY.size);

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST. It targets a REAL pin
     (D2) and perturbs a field D2's reader does not read. The registry must
     score it CANNOT FAIL; a sweep that "kills" this is scoring noise. */
  const CTL = sweep([
    M('D2', 'D88 NULL CONTROL — a field D2\'s reader does not read is perturbed', null,
      (i) => ({ ...i, o: i.o.map((c) => ({ ...c, name: `${c.name}!` })) })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['D2']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  /* Every text mutant below perturbs THE PUBLISHER'S OWN SOURCE, which D3
     proves is the shipped module, and it is COMPILED INSIDE THE READER from
     that text — not swapped for an already-built closure, because
     inputCanon hashes String(fn) and new Function's String() is the mutated
     text (D88, sixth defect, declared in the header). */
  const MUTANTS = [
    /* THE SCRATCH ESCAPES. boundaries.md section B.2: `fwd*` is a COPY of what
       connect/index.js's module-level scratch holds, NEVER the scratch. This
       is that sentence's negation, compiled out of the publisher's own text:
       Object.freeze is shallow, so a scratch parked on a frozen pose is a
       live three vector wearing a frozen envelope. */
    M('A1', 'the module-level forward SCRATCH is parked on the pose instead of its three components — a live three vector inside a frozen envelope', [0, 2],
      (i) => ({ ...i,
        audit: auditValue(publishOn(compilePublisher(mutateText(SRC.publication, 'A1',
          '      fwdX: _fwd.x,', '      fwd: _fwd,\n      fwdX: _fwd.x,')), SCENE_A, FLIGHT)) })),
    M('A2', 'the publication is handed out UNFROZEN — the exact mutation a canonicaliser cannot see', [0, 1],
      (i) => ({ ...i, audit: auditValue({ ...FRAME_A, viewport: { w: 1, h: 2 } }) })),
    M('A3', 'the live-object detector stops recognising a camera, so the shipped zero would be the zero of not looking', [1, 2],
      (i) => ({ ...i, synth: auditValue({ cameraPose: { plain: 1 } }) })),
    /* The pose is shallow-frozen AND carries a different x, because
       inputCanon CANNOT SEE FROZEN-NESS (D88, declared in the header): an
       unfreeze alone canonicalises identically and gate 2 reports the
       perturbation as a no-op. The moved x is what makes the mutation
       visible to the instrument; the unfreeze is what makes it visible to
       the assertion. */
    M('A4', 'the value is frozen SHALLOWLY — the pose stays writable and a reader can correct it in place', [1, 5],
      (i) => ({ ...i, frame: Object.freeze({ ...FRAME_A, cameraPose: { ...FRAME_A.cameraPose, x: 5 } }) })),
    M('B1', 'the publication reads the camera position TWICE — a second read of a live object it has already copied', [0, 1, 2],
      (i) => ({ ...i,
        t: { ...i.t, duringPublish: [...i.t.duringPublish, 'position.x'] } })),
    M('B2', 'a reader of the value reaches back to the camera after publication — the whole failure J02 exists to make impossible', [1],
      (i) => ({ ...i, t: { ...i.t, afterReaders: i.t.afterReaders + 3 } })),
    M('B3', 'the clock is read on every access to `at` instead of once at publication', [0],
      (i) => ({ ...i, make: compilePublisher(mutateText(SRC.publication, 'B3',
        '      at: performance.now(),', '      get at() { return performance.now(); },')) })),
    M('B4', 'the publisher keeps its latest frame in MODULE scope, so a second journey inherits the first one\'s', null,
      (i) => ({ ...i, make: (() => { let shared = null; let n = 0;
        return (scene) => ({
          publish(a) { n += 1; shared = Object.freeze({ ...i.make(scene).publish(a), seq: n }); return shared; },
          frame: () => shared,
        }); })() })),
    /* Gate 4's axis, measured rather than assumed: a live getter moves the
       THIRD element as well as the second, because the reader restores the
       window before it compares and a getter answers with the restored
       value. A frozen pair cannot do that, which is the point. */
    M('B5', 'the viewport is a LIVE view of the window rather than a frozen pair read at publication', [1, 2],
      (i) => ({ ...i, make: compilePublisher(mutateText(SRC.publication, 'B5',
        '      viewport: Object.freeze({ w: window.innerWidth, h: window.innerHeight }),',
        '      viewport: Object.freeze({ get w() { return window.innerWidth; }, get h() { return window.innerHeight; } }),')) })),
    M('B6', 'J-H15 — the fog is read from the blend\'s recorded start instead of the live post-blend value', [1],
      (i) => ({ ...i, make: compilePublisher(mutateText(SRC.publication, 'B6',
        '      fogNear: fog.near,\n      fogFar: fog.far,',
        '      fogNear: 7,\n      fogFar: 20,')) })),
    M('C1', 'the publication is HOISTED to the top of applyFrame — J-H15\'s shape, and the one S2 cannot see', [1, 4],
      (i) => ({ ...i, body: i.body.replace('const frame = framePublisher.publish({', 'X(')
        .replace('  function applyFrame(p, dt) {', '  function applyFrame(p, dt) {\n    const frame = framePublisher.publish({') })),
    M('C2', 'the frame-order suite grows the token, so S2 would look like runtime evidence for this seam', [0],
      (i) => ({ ...i, fo: `${i.fo}\n    'framePublisher.publish(',` })),
    M('C3', 'applyChapterFrame goes back to reading the model for gliding, halfway down the reader list', [0, 1],
      (i) => ({ ...i, body: i.body.replace('frame.gliding, guarded)', 'scroll.gliding, guarded)') })),
    M('C4', 'a second publisher is constructed, so the frame counter and sceneApi.frame() stop having one answer', [0],
      (i) => ({ ...i, journey: `${i.journey}\n  const other = createFramePublisher(sceneApi);\n  other.publish({});` })),
    M('C5', 'main.js starts naming the camera in code — section B.6a\'s reclassification silently reversing', [0, 1, 3],
      (i) => ({ ...i, naming: [...i.naming, 'main.js'].sort() })),
    M('C6', 'the comment filter stops stripping block comments AND string literals, so prose and data re-enter the camera scan', [2, 3],
      (i) => ({ ...i, code: (s) => s.replace(/(^|[^:])\/\/[^\n]*/g, '$1') })),
    /* D1's four, one per pin (D58). C8 and C9 are mutated in OPPOSITE
       directions on purpose — a loose read coming back, and a new live tap
       being added — because a single mutant would leave half of what the
       routing claims unexercised. */
    M('C8', 'one reader goes back to the loose local — the seams call re-points at `frameP`, exactly the drift the publication\'s own header says is silently reversible', [0, 2],
      (i) => ({ ...i, region: i.region.replace('seams.update(frame.routeP)', 'seams.update(frameP)') })),
    M('C9', 'an EIGHTH live reach appears below the publication — a reader takes the frozen frame and then goes to the controller anyway', [0, 1],
      (i) => ({ ...i, region: `${i.region}\n    if (transition.blend) {}\n` })),
    M('C10', '`seq` becomes a live getter over the publisher\'s counter, so a frame already handed to a reader silently re-numbers itself when the next one is published', [0, 1, 3],
      (i) => ({ ...i, make: compilePublisher(mutateText(SRC.publication, 'C10',
        '      seq,', '      get seq() { return seq; },')) })),
    M('C11', 'the phase keys `kind` off the BLEND\'S DIRECTION instead of off the wrap ticket — right on a rewound lap, wrong on every forward one', [0, 1],
      (i) => ({ ...i, make: compilePublisher(mutateText(SRC.publication, 'C11',
        "      kind: wrap ? 'wrap' : flight ? 'flight' : 'blend',",
        "      kind: blend.play < 0 ? 'wrap' : flight ? 'flight' : 'blend',")) })),
    M('C7', 'the vendored three file moves and the alias follows it, while this suite keeps importing the old path — two copies of three, one graph edge', [0],
      (i) => ({ ...i, madge: i.madge.replace("three$: path.resolve(__dirname, 'vendor/three/three.module.js')", "three$: path.resolve(__dirname, 'vendor/three/build/three.module.js')") })),
    M('D1', 'the pose derives az from the TARGET rather than the position — the same formula, the wrong two doubles', [0, 1],
      (i) => {
        const f = compilePublisher(mutateText(SRC.publication, 'D1', '      az: Math.atan2(px, pz),', '      az: Math.atan2(tgt.x, tgt.z),'));
        return { ...i, o: GRID.map((g) => { const s = makeScene(g); const pose = publishOn(f, s, NO_BLEND).cameraPose;
          const sh = shippedDerivation(s);
          return { name: g.name, azSame: pose.az === sh.az && pose.az === sh.seamsAz,
            rSame: pose.r === sh.r && pose.r === sh.connectR,
            fwdSame: pose.fwdX === sh.fwd[0] && pose.fwdY === sh.fwd[1] && pose.fwdZ === sh.fwd[2],
            az: pose.az, r: pose.r }; }) };
      }),
    M('D2', 'the grid loses every pose but one, so agreement is agreement about a single angle', [0, 1],
      (i) => ({ ...i, o: [i.o[0], i.o[0], i.o[0], i.o[0], i.o[0]] })),
    M('D3', 'the compile silently drops a member of the published value, so a text mutant would be mutating a text nobody ships', [0],
      (i) => ({ ...i, compiled: compilePublisher(SRC.publication.replace('      aspectProfile: null,\n', '')) })),
    M('D4', 'the phase RECONSTRUCTS its endpoints from a field the blend does not record, instead of taking the two it does', [1, 2, 3],
      (i) => ({ ...i, make: compilePublisher(mutateText(SRC.publication, 'D4',
        '      fromP: blend.routeFromP,', '      fromP: blend.homeP,')) })),
    M('E1', 'the entry is filed away from its named neighbours', null,
      (i) => ({ ...i, src: i.src.replace('    "journey/frame/publication.js",\n', '') })),
    M('E2', 'a second frame entry appears in the manifest', null,
      (i) => ({ ...i, src: i.src.replace('"journey/frame/publication.js",', '"journey/frame/publication.js",\n    "journey/frame/extra.js",') })),
  ];

  const res = sweep(MUTANTS);
  L.discard();
  L.same('P1', 'D50 — mutants exercised', res.total, MUTANTS.length);
  L.same('P2', 'D50 — every mutant drove its named assertion red, on the axis it declared', res.bad, 0);
  /* D88 — THE DECLARED-EQUIVALENCE SET IS EMPTY. Every mutation above changes
     a quantity some pin reads; none is a refactoring that leaves behaviour
     intact. So the survivor set must be empty, and P0a is the separate proof
     that an empty survivor set is a finding rather than an instrument that
     cannot report one. */
  L.same('P3', 'D88 — the survivor set EQUALS the declared-equivalence set, which for this list is empty',
    res.gates.outputStill, []);
  L.same('P4', 'D74 — no mutant reported BROKEN (a rotted anchor is never a silent kill)',
    Object.entries(res.gates).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.join(',')}`), []);
  L.same('P5', 'D70 — harness faults during the sweep (re-raised after the report, never scored)', res.faults, []);
  L.same('P6', 'D58 — registered pins carrying no mutant', res.uncovered, []);
  L.same('P7', 'D58 — every registered pin is mutated exactly once; the null control is the only extra mutant and it ran separately',
    [REGISTRY.size, MUTANTS.length, CTL.total], [MUTANTS.length, MUTANTS.length, 1]);
  SENTINEL.reach('prove');
  exitCode = L.report() || exitCode;
  if (res.faults.length) {
    throw new HarnessFault(`${res.faults.length} harness fault(s) during the sweep:\n  ${res.faults.join('\n  ')}`);
  }
}

process.exit(exitCode);
