#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-transition.mjs — J01, the transition controller.
 *
 * SUBJECT
 *   journey/transition/controller.js   the extracted owner of every piece
 *                                      of transition state, and of the six
 *                                      operations over it.
 *   journey/journey.js                 the seam: what it stopped holding,
 *                                      and how it reaches what it lost.
 *
 * WHAT IS BEING PROVED, IN ONE SENTENCE
 *   The controller decides cancellation from ONE discriminated semantic
 *   value — the model's ManualClaim, obtained through inputPortOf(scroll) —
 *   and endpoint, reversal, cancellation, rewind and landing behave exactly
 *   as they did when the same code was eleven `let`s in journey.js's boot()
 *   closure.
 *
 * THE TWO HALVES, AND WHY THEY ARE DIFFERENT KINDS OF ROW
 *   A/B/C are STATIC: the injection shape, the identifier scan, and the
 *   seam. They are backstops. None of them is cited as runtime evidence.
 *   D and E are EXECUTED. D is the oracle closure — A05a's technique, as
 *   used by tools/test-input-claim.mjs: the substitution J01 actually made
 *   (`claim.dir` where `scroll.lastDir` used to be read) is run on both
 *   sides over a grid AND over a live model, and the answers compared. E
 *   drives the SHIPPED controller, compiled out of its own source text, and
 *   pins the whole observable trace of each of the five named transitions.
 *
 * D46 — EVERY ASSERT-ZERO ROW CARRIES ITS POSITIVE CONTROL, in the same
 *   array as the zero. A2's zero over journey/transition/** is paired with
 *   the same scan over journey/journey.js; B1's is paired with the same scan
 *   over journey/scroll.js, where every one of those identifiers lives; B2 is
 *   the control for B1's blindness, stated as a fixture rather than as prose.
 *
 * D94 — NO PIN READS A HAND-WRITTEN COLLECTION. Every array compared here is
 *   produced by slicing or executing a subject: the dependency set comes out
 *   of the controller's own parameter list, the state-name census out of the
 *   two files, the grid out of its own axes, the traces out of a running
 *   controller. The cardinalities are the subjects' own.
 *
 * D99 — and each is a SITE SET, not a bare count: a call site that moves is
 *   a different row, which a total could not say.
 *
 * D88, THE REGISTRY'S TWO BLIND SPOTS, DECLARED because this subject walks
 *   straight into one of them. `inputCanon` cannot see FROZEN-NESS: a mutant
 *   that only unfreezes a ManualClaim moves nothing it can observe and would
 *   be scored gate-2 `inputNoOp`, not a survivor. No mutant below does that,
 *   and freezing is proved where it can be — by executing Object.isFrozen
 *   inside a reader (D3), which is a value the canon CAN see. It also has no
 *   `Map` branch, so no input field here is a Map.
 *
 * D84 — WHAT THIS FILE DOES NOT RE-DERIVE. The ledger, the abort sentinel,
 *   the harness-fault type, the mutant registry and the comment stripper come
 *   from tools/instrument-ledger.mjs, tools/mutant-registry.mjs,
 *   tools/self-controls.mjs and tools/strip-comments.mjs. The DOM-free
 *   environment and the input rig come from tools/test-c01-harness.mjs.
 *   Nothing is copied. No tree is staged and nothing is written (D56).
 *
 * D93 — every slice is anchored on TEXT and REFUSES on a miss. No line
 *   number appears in any anchor.
 *
 * Usage:
 *   node tools/test-transition.mjs
 *   node tools/test-transition.mjs --prove-failure
 * ==================================================================== */

import { readFileSync, readdirSync } from 'node:fs';
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

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');

const SENTINEL = armSentinel('test-transition', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const SELF_PATH = fileURLToPath(import.meta.url);
const SRC_SELF = readFileSync(SELF_PATH, 'utf8');

const TRANSITION_DIR = 'journey/transition';
const CONTROLLER = `${TRANSITION_DIR}/controller.js`;

const SRC = {
  controller: read(CONTROLLER),
  journey: read('journey/journey.js'),
  scroll: read('journey/scroll.js'),
  baseline: read('tools/test-render-baseline.mjs'),
};

/** Every .js under journey/transition/, as {path: strippedSource}. The scan
 *  set is the DIRECTORY's, never a list typed here (D94), so a second module
 *  landing in the slice is scanned on the day it lands. */
const TRANSITION_FILES = readdirSync(join(REPO, TRANSITION_DIR), { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.js'))
  .sort()
  .map((f) => `${TRANSITION_DIR}/${f}`);
if (!TRANSITION_FILES.length) fault('journey/transition/ holds no .js — the scan would be vacuous');
const TRANSITION_CODE = TRANSITION_FILES
  .map((f) => stripComments(read(f), { blankStrings: true })).join('\n');

/* The environment first: the harness installs the DOM-free globals and the
   frozen clock at module scope, BEFORE journey/scroll.js is evaluated. */
const H = await import(join(REPO, 'tools/test-c01-harness.mjs'));
const CLAIM = await import(join(REPO, 'journey/claim.js'));
const CTRL = await import(join(REPO, CONTROLLER));
const BLEND = await import(join(REPO, 'journey/camera-blend.js'));
const ENTRY = await import(join(REPO, 'journey/chapter-entry.js'));
const K = await import(join(REPO, 'journey/constants.js'));

/* ------------------------------------------------------------------ *
 * Slicing — text-anchored, refusing on a miss (D93).                  *
 * ------------------------------------------------------------------ */

/** `header` through the first line equal to `close`. A miss is a fault. */
function fnSlice(tag, src, header, close = '  }') {
  const lines = src.split('\n');
  const a = lines.indexOf(header);
  if (a < 0) fault(`${tag}: ANCHOR MISS on header ${JSON.stringify(header)}`);
  const b = lines.indexOf(close, a + 1);
  if (b < 0) fault(`${tag}: ANCHOR MISS on the closing ${JSON.stringify(close)} after ${header}`);
  return lines.slice(a, b + 1).join('\n');
}

const A = {
  factory: 'export function createTransitionController({',
  factoryEnd: '}) {',
  steer: '  function steerWrapBlend(dir) {',
  cancelled: '  function blendCancelled() {',
  port: '    input: inputPortOf(scroll),',
};

/** The controller's DECLARED dependency set, read out of its own destructured
 *  parameter list — never typed here. */
const DEPENDENCIES = (() => {
  const head = fnSlice('controller', SRC.controller, A.factory, A.factoryEnd);
  const inner = head.slice(head.indexOf('{') + 1, head.lastIndexOf('}'));
  const names = inner.split(',').map((s) => s.trim()).filter(Boolean);
  if (names.length < 5) fault('controller: the dependency slice came back too short to be the real list');
  return names.sort();
})();

/* ------------------------------------------------------------------ *
 * A — E-A2: the injection shape.                                      *
 * ------------------------------------------------------------------ */
console.log('A — E-A2: what the controller is handed, and what it therefore cannot reach');

pin('A1', 'the declared dependency set is the decision port and collaborators — and `scroll` is not a member of it',
  (i) => [i.deps.join('+'), i.deps.includes('scroll'), i.deps.includes('input'), i.deps.length],
  { deps: DEPENDENCIES },
  ['chapterAt+chapters+director+guarded+heroPresenceNow+heroShownNow+input+lens+paintHero+placeAt+sceneApi+ui',
    false, true, 12],
  'boundaries.md §A.6 E-A2: createTransitionController({ decisions, input, frame, ... }) with NO `scroll` parameter — every naive reach for a diagnostic getter has no identifier to reach through');

pin('A2', 'no file under journey/transition/ names `scroll` at all — and the same scan finds it many times over in journey.js, which legitimately holds the model',
  (i) => [(i.transition.match(/\bscroll\b/g) || []).length,
    (i.journey.match(/\bscroll\b/g) || []).length > 10,
    i.files.length],
  { transition: TRANSITION_CODE,
    journey: stripComments(SRC.journey, { blankStrings: true }),
    files: TRANSITION_FILES },
  [0, true, 1],
  'the file count is pinned so the zero cannot come from a scan that read nothing (design.md §8.3 asked for exactly this guard)');

pin('A3', 'the port is obtained ONCE, in journey.js, and handed in as `input`',
  (i) => [(i.journey.match(/inputPortOf\(/g) || []).length,
    i.journey.includes('    input: inputPortOf(scroll),'),
    (i.transition.match(/inputPortOf/g) || []).length],
  { journey: stripComments(SRC.journey, { blankStrings: true }), transition: TRANSITION_CODE },
  [1, true, 0],
  'the controller does not look its own port up: it is given one, so a second model cannot be reached from inside it');

/* ------------------------------------------------------------------ *
 * B — E-A4: the diagnostic identifier scan, and its declared blindness.
 * ------------------------------------------------------------------ */
console.log('\nB — E-A4: the static identifier scan, and the two things it cannot see');

/** The diagnostic surface J01 must not depend on. Not a taste list: every
 *  name here is a member of the model's root surface or a private of it that
 *  the cancellation predicate used to read. */
const DIAGNOSTIC = [
  'sinceInput', 'answeredAt', 'lastInput', 'answeredP', 'gesturePeak',
  'commitP', 'rate', 'streaming', 'surface', 'resolveCruise', 'resolveTarget',
  'stallBank', 'carry', 'gSerial',
];
const diagHits = (src) => DIAGNOSTIC.filter((n) => new RegExp(`\\b${n}\\b`).test(src));

pin('B1', 'E-A4: ZERO diagnostic identifiers under journey/transition/ — and the same scan finds every one of them in journey/scroll.js, where they live',
  (i) => [i.scan(i.transition), i.scan(i.scroll).length, i.names.length],
  { scan: diagHits, transition: TRANSITION_CODE,
    scroll: stripComments(SRC.scroll, { blankStrings: true }), names: DIAGNOSTIC },
  [[], 14, 14],
  'J01\'s focused proof, as a backstop and NEVER as runtime evidence: no raw sinceInput/credit/answeredAt or telemetry dependency');

pin('B2', 'D46 — the declared blind spots, as FIXTURES rather than as prose: the scan sees a literal read and is blind to a computed one and to the documented global',
  (i) => i.fixtures.map((f) => i.scan(f).length),
  { scan: diagHits,
    fixtures: ['const x = m.sinceInput;',
      "const k = 'since' + 'Input'; const x = m[k];",
      'const x = window.journey.scroll.gesturePeak;'] },
  [1, 0, 1],
  'boundaries.md §A.6: E-A2 removes the DIRECT binding; `window.journey.scroll` is a declared standing hole (Q10). The middle 0 is what "backstop, not enforcement" means, measured');

/* ------------------------------------------------------------------ *
 * C — the seam: what journey.js stopped holding.                      *
 * ------------------------------------------------------------------ */
console.log('\nC — the seam: journey.js holds none of it, and reaches all of it by name');

/** The eleven transition state names, as a census over a source: which of
 *  them that file DECLARES with `let`. */
const STATE_NAMES = [
  'camBlend', 'railWrap', 'railFlight', 'chapterEntry', 'cameraStateDisagree',
  'heroEntry', 'heroGate', 'heroExit',
];
const declaredIn = (src) => STATE_NAMES.filter((n) => new RegExp(`\\blet ${n}\\b`).test(src));

pin('C1', 'every one of the eight transition `let`s is DECLARED in the controller and NONE of them in journey.js',
  (i) => [i.declared(i.controller), i.declared(i.journey), i.names.length],
  { declared: declaredIn, controller: stripComments(SRC.controller, { blankStrings: true }),
    journey: stripComments(SRC.journey, { blankStrings: true }), names: STATE_NAMES },
  [['camBlend', 'railWrap', 'railFlight', 'chapterEntry', 'cameraStateDisagree',
    'heroEntry', 'heroGate', 'heroExit'], [], 8],
  'D99: a site set, not a count — a `let` that stayed behind is a named row rather than an off-by-one');

pin('C2', 'the site set of controller members journey.js reaches, derived from journey.js itself',
  (i) => [...new Set((i.journey.match(/\btransition\.[A-Za-z]+/g) || []))].sort(),
  { journey: stripComments(SRC.journey, { blankStrings: true }) },
  ['transition.abandonForJump', 'transition.armHeroEntry', 'transition.armHeroExit',
    'transition.beginBlend', 'transition.beginFlight', 'transition.blend',
    'transition.blendCancelled', 'transition.cameraStateDisagree', 'transition.chapterEntry',
    'transition.clearHeroTerms', 'transition.dropCamBlend', 'transition.heroExiting',
    'transition.landWrapHome', 'transition.railFlight', 'transition.railWrap',
    'transition.rewoundHome', 'transition.setBlending', 'transition.steerWrapBlend',
    'transition.stepCamBlend', 'transition.stepHeroEntry', 'transition.stepHeroExit'],
  'D54/D99: the seam AS A MANIFEST. A member added, dropped or renamed moves exactly the row it touches');

pin('C3', 'blendCancelled() is called INSIDE applyFrame\'s own guards, never hoisted — the port reads a clock, and the no-blend path must not pay for it',
  (i) => [(i.journey.match(/transition\.blendCancelled\(\)/g) || []).length,
    /if \(transition\.blend\) \{\n\s*const claim = transition\.blendCancelled\(\);/.test(i.journey),
    /!transition\.blend && transition\.chapterEntry && transition\.blendCancelled\(\)/.test(i.journey)],
  { journey: stripComments(SRC.journey, { blankStrings: true }) },
  [2, true, true],
  'journey/scroll.js claimNow(): "CALL IT WHERE THE QUESTION IS ASKED, ONCE PER SITE, AND NEVER HOIST IT" — hoisting moves the read across the whole cancellation block on the camBlend-falsy path, which design.md §12 counts and the frozen-clock harness cannot see');

/* ------------------------------------------------------------------ *
 * D — THE ORACLE. The one substitution J01 made, both sides executed.  *
 * ------------------------------------------------------------------ */
console.log('\nD — the oracle: `claim.dir` where `scroll.lastDir` was read, over a grid and over a live model');

/* The live half: the same substitution on states a real model reaches. */
function driveTrace() {
  const r = H.createRig({});
  const port = CLAIM.inputPortOf(r.scroll);
  if (!port) fault('D4: the model published no input port');
  const obs = [];
  const sample = (tag) => {
    const claim = port.claimNow();
    obs.push({
      tag,
      live: claim !== null,
      dir: claim === null ? null : claim.dir,
      lastDir: r.scroll.lastDir,
    });
  };
  r.reset(0.3); sample('reset');
  r.wheel(120, 16); sample('wheel-1');
  r.frame(16); sample('frame-1');
  r.wheel(240, 8); sample('wheel-2');
  r.frame(16); sample('frame-2');
  r.scroll.retire(1); sample('retire');
  r.wheel(-120, 8); sample('wheel-back');
  r.settle(600); sample('settled');
  r.wheel(-240, 16); sample('wheel-back-2');
  r.key('ArrowDown'); sample('key');
  r.touchStart(400); sample('touchstart');
  r.touchMove(300, 16); sample('touchmove');
  r.touchEnd(); sample('touchend');
  r.scroll.setProgress(0.5); sample('placement');
  r.settle(1200); sample('settled-2');
  return obs;
}
const OBS = driveTrace();

/** lastDir's domain, MEASURED rather than typed: the grid's direction axis is
 *  the set of values a live model actually visits on the trace above, so a
 *  fourth direction arriving in the model widens the grid instead of slipping
 *  past it. (D94, and the reason D2 below is not a literally-closed pin.) */
const DIR_DOMAIN = [...new Set(OBS.map((o) => o.lastDir))].sort((a, b) => a - b);

/** Compile the SHIPPED steerWrapBlend out of the controller's own text into a
 *  standalone function over a blend object. The only hand-written lines are
 *  the preamble that binds the names its body closes over. */
function compileSteer(src) {
  const body = `
    let camBlend = null;
    const log = [];
    const guarded = (n, fn) => fn();
    const ui = { setCopyEntryPlay: (p) => log.push('ui.setCopyEntryPlay(' + p + ')') };
    const setHeroEntryPlay = (p) => log.push('hero.play(' + p + ')');
    const setBlending = (on, x, d) => log.push('setBlending(' + on + ',' + x + ',' + d + ')');
${src}
    return (blend, dir) => { camBlend = blend; log.length = 0; steerWrapBlend(dir); return [blend.play, log.join('|')]; };
  `;
  try { return new Function(body)(); } catch (e) {
    fault(`the sliced steerWrapBlend() did not compile — ${e.message}`);
  }
  return null;
}
const STEER_SRC = fnSlice('controller', SRC.controller, A.steer);
/* Compiled INSIDE the reader, from the source held in the pin's input: a
   compiled closure canonicalises to the hash of its own String(), which is
   identical however its body was built, so a mutant of the body would be
   scored gate-2 `inputNoOp` rather than run. The text is what moves. */

const blendFor = (wrapDir, play) => ({
  wrapDir, play, dur: 4, t: 1, dstX: 9, pos0: { x: 3 },
});

/** The grid: lastDir's whole domain against both wrap senses and both play
 *  states. For each cell the SHIPPED path (the claim's `dir`) and the path it
 *  replaced (the model's `lastDir`) are run on identical blends and their
 *  results compared. */
function survey(i) {
  const steer = compileSteer(i.steerSrc);
  let compared = 0;
  let mismatch = 0;
  let steered = 0;
  let inert = 0;
  let branchMismatch = 0;
  for (const lastDir of i.dirs) {
    for (const wrapDir of i.wraps) {
      for (const play of i.plays) {
        compared++;
        const claim = i.manualClaim(lastDir);
        // The branch applyFrame takes: `blend.wrapDir && claim.dir` today,
        // `blend.wrapDir && scroll.lastDir` before J01.
        const nowSteers = !!(wrapDir && claim.dir);
        const wasSteers = !!(wrapDir && lastDir);
        if (nowSteers !== wasSteers) branchMismatch++;
        const a = steer(blendFor(wrapDir, play), claim.dir);
        const b = steer(blendFor(wrapDir, play), lastDir);
        if (a.join('~') !== b.join('~')) mismatch++;
        if (a[1]) steered++; else inert++;
      }
    }
  }
  return [mismatch, branchMismatch, compared, steered, inert];
}

pin('D1', 'THE SUBSTITUTION IS AN IDENTITY: on every cell of the grid the claim\'s `dir` steers the lap exactly as the model\'s `lastDir` did — and the grid reaches both outcomes',
  survey,
  { steerSrc: STEER_SRC, manualClaim: CLAIM.manualClaim, dirs: DIR_DOMAIN, wraps: [1, -1], plays: [1, -1] },
  [0, 0, 12, 6, 6],
  'mismatch, branch mismatch, compared, steered, inert. A05a\'s technique: the shipped body is sliced out of text and executed, so this is not "looks right"');

pin('D2', 'the grid\'s cardinality is the product of its own axes — nobody typed 12, and the direction axis is the domain the live model VISITS',
  (i) => [i.dirs.length * i.wraps.length * i.plays.length, i.dirs, i.wraps.length, i.plays.length],
  { dirs: DIR_DOMAIN, wraps: [1, -1], plays: [1, -1] }, [12, [-1, 0, 1], 2, 2],
  'D94: the collection is derived from its own axes and pinned on their product; the direction axis comes off the trace, so this pin is not literally closed');

pin('D3', 'what the controller consumes is DISCRIMINATED and FROZEN — there is no scalar in it to truthiness-test, and `dir === 0` is a claim rather than the absence of one',
  (i) => [i.dirs.map((d) => Object.isFrozen(i.manualClaim(d))),
    i.dirs.map((d) => Object.keys(i.manualClaim(d)).join('+')),
    i.manualClaim(0) === null,
    i.manualClaim(0).dir],
  { manualClaim: CLAIM.manualClaim, dirs: DIR_DOMAIN },
  [[true, true, true], ['dir', 'dir', 'dir'], false, 0],
  'J-H2: `answeredAt === 0` — the Mission anchor — has repeatedly been read as "no wall". A frozen {dir} cannot be read that way. Object.isFrozen is EXECUTED here because inputCanon cannot see frozen-ness (D88 blind spot, declared in the header)');

pin('D4', 'THE LIVE HALF: on every state the model actually reaches, a live claim\'s `dir` IS the model\'s `lastDir` — and the trace reaches both verdicts and all three directions',
  (i) => [i.obs.filter((o) => o.live && o.dir !== o.lastDir).length,
    i.obs.filter((o) => o.live).length,
    i.obs.filter((o) => !o.live).length,
    [...new Set(i.obs.filter((o) => o.live).map((o) => o.dir))].sort((a, b) => a - b),
    i.obs.length],
  { obs: OBS }, [0, 11, 4, [-1, 0, 1], 15],
  'a grid proves agreement on states I chose; a trace proves it on states the model reaches. The live/null split is the Engine 3 guard — an all-null trace would agree vacuously');

/* ------------------------------------------------------------------ *
 * E — THE FIVE TRANSITIONS, driven against the shipped controller.     *
 * ------------------------------------------------------------------ */
console.log('\nE — endpoint, cancellation, reversal, rewind, landing: the shipped controller, traced');

/** Compile the WHOLE controller module out of its own text, so a mutant of
 *  that text is a mutant of the shipped subject (D58). E0 is the control that
 *  this compile is faithful: the text-built controller and the IMPORTED
 *  module must produce byte-identical traces on the same scenario. */
function compileController(src) {
  const noImports = src.replace(/^import[^;]*;\n/gm, '');
  if (noImports.includes('\nimport ')) fault('compile: an import survived the strip');
  const marker = 'export function createTransitionController';
  if (!src.includes(marker)) fault('compile: ANCHOR MISS on the factory export');
  const body = noImports.replace(marker, 'return function createTransitionController');
  try {
    return new Function(
      'createCameraBlendStepper', 'snapChapterLandings',
      'COPY_JUMP_LEAD', 'COPY_JUMP_TAIL_S', 'COPY_IN_K', body,
    )(BLEND.createCameraBlendStepper, ENTRY.snapChapterLandings,
      K.COPY_JUMP_LEAD, K.COPY_JUMP_TAIL_S, K.COPY_IN_K);
  } catch (e) { fault(`the controller did not compile out of its own text — ${e.message}`); }
  return null;
}

const n3 = (v) => (typeof v === 'number' ? v.toFixed(3) : String(v));
const V = (x = 0, y = 0, z = 0) => ({
  x, y, z,
  clone() { return V(this.x, this.y, this.z); },
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; },
  set(x2, y2, z2) { this.x = x2; this.y = y2; this.z = z2; return this; },
  lerpVectors(a, b, t) {
    this.x = a.x + (b.x - a.x) * t;
    this.y = a.y + (b.y - a.y) * t;
    this.z = a.z + (b.z - a.z) * t;
    return this;
  },
});

/** One stub world. Everything the controller can reach writes into `log`. */
function makeRig(factory, { owned = true, heroShown = 1, presence = 0 } = {}) {
  const log = [];
  const sceneApi = {
    camera: {
      position: V(6, 2, 0), fov: 45, up: V(),
      lookAt() {}, updateProjectionMatrix() { log.push('cam.fov'); },
    },
    controls: { target: V() },
    scene: { fog: null },
  };
  const director = {
    owned,
    apply: (p) => log.push(`director.apply(${n3(p)})`),
    restoreHero: () => log.push('director.restoreHero'),
    applyHeroPose: () => log.push('director.applyHeroPose'),
  };
  const lens = {
    look: {},
    lookOf: (p) => ({ g: p }),
    setLookOverride: (v) => log.push(`lens.setLookOverride(${v === null ? 'null' : 'look'})`),
  };
  const ui = {
    cancelCopyEntry: () => log.push('ui.cancelCopyEntry'),
    setCopyEntryPlay: (p) => log.push(`ui.setCopyEntryPlay(${p})`),
  };
  const chapters = {
    mission: {
      setBlending: (on, x, d) => log.push(`mission.setBlending(${on},${n3(x)},${n3(d)})`),
      snapLanding: () => log.push('mission.snapLanding'),
    },
    final: { setBlending: (on, x, d) => log.push(`final.setBlending(${on},${n3(x)},${n3(d)})`) },
  };
  let claim = null;
  const t = factory({
    input: { claimNow: () => claim },
    sceneApi,
    director,
    lens,
    ui,
    chapters,
    guarded: (_name, fn) => fn(),
    chapterAt: (p) => ({ id: p < 0.5 ? 'mission' : 'final' }),
    placeAt: (p) => log.push(`placeAt(${n3(p)})`),
    paintHero: (a) => log.push(`paintHero(${n3(a)})`),
    heroShownNow: () => heroShown,
    heroPresenceNow: () => presence,
  });
  return {
    t, log, sceneApi, director,
    setClaim: (c) => { claim = c; },
    setShown: (v) => { heroShown = v; },
  };
}

const blendOf = (over = {}) => ({
  t: 0, dur: 1, play: 1, pos0: V(1, 0, 0), tgt0: V(), fov0: 40, fog: null,
  fogN0: 0, fogF0: 0, fogN1: 0, fogF1: 0, az1: null, bow: 0, rise: 0,
  look0: { g: 0 }, look1: { g: 1 }, look: { g: 1 },
  wrapDir: 0, homeP: 0, routeFaithful: false, routeFromP: 0, routeTargetP: 0,
  presentedP: null, dstX: 9, ...over,
});

/** THE FIVE SCENARIOS. Each returns [trace, stateReadback] and each is run
 *  against a controller built by the factory it is handed, so the same
 *  scenario can drive the imported module and the text-compiled one. */
const SCENARIOS = {
  /* ENDPOINT — an ordinary click's blend runs to f >= 1 and lands. */
  landing(factory) {
    const r = makeRig(factory);
    r.t.beginFlight({ railWrap: null, railFlight: { fromP: 0, targetP: 0.5, phase: 0 }, chapterEntry: { id: 'final', f: 0, t: 0, dur: 1 } });
    r.t.beginBlend(blendOf());
    r.t.setBlending(true, 9, 1);
    r.t.stepCamBlend(0.5);
    r.log.push(`mid:${n3(r.t.blend.t)}/${n3(r.t.railFlight.phase)}/${r.t.cameraStateDisagree}`);
    r.t.stepCamBlend(0.6);
    return [r.log, `blend=${r.t.blend}/entry=${r.t.chapterEntry && r.t.chapterEntry.id}/disagree=${r.t.cameraStateDisagree}`];
  },
  /* CANCELLATION — a live claim on a non-wrap blend drops it. */
  cancellation(factory) {
    const r = makeRig(factory, { owned: false });
    r.t.beginFlight({ railWrap: null, railFlight: { fromP: 0, targetP: 0.5, phase: 0 }, chapterEntry: { id: 'final' } });
    r.t.beginBlend(blendOf());
    r.t.armHeroEntry('mission', 1);
    r.log.push(`claim:${r.t.blendCancelled()}`);
    r.setClaim(CLAIM.manualClaim(1));
    const claim = r.t.blendCancelled();
    r.log.push(`claim:${claim.dir}`);
    r.t.dropCamBlend();
    return [r.log, `blend=${r.t.blend}/entry=${r.t.chapterEntry}/disagree=${r.t.cameraStateDisagree}`];
  },
  /* REVERSAL — a wrap lap steered against its own direction. */
  reversal(factory) {
    const r = makeRig(factory);
    r.t.beginFlight({ railWrap: { dir: 1, homeP: 0.75, phase: 0 }, railFlight: null, chapterEntry: null });
    r.t.beginBlend(blendOf({ wrapDir: 1, dur: 4, homeP: 0.75 }));
    r.t.armHeroEntry('mission', 4);
    r.t.stepCamBlend(1);
    r.t.steerWrapBlend(-1);
    r.log.push(`play:${r.t.blend.play}`);
    r.t.steerWrapBlend(-1);                       // idempotent: no re-announce
    r.log.push(`hero:${n3(r.t.stepHeroEntry(0.5))}`);
    return [r.log, `play=${r.t.blend.play}/rewound=${r.t.rewoundHome}`];
  },
  /* REWIND + LANDING HOME — the steered lap reaches its own first frame. */
  rewind(factory) {
    const r = makeRig(factory, { owned: false });
    r.t.beginFlight({ railWrap: { dir: 1, homeP: 0.75, phase: 0 }, railFlight: null, chapterEntry: null });
    r.t.beginBlend(blendOf({ wrapDir: 1, dur: 4, homeP: 0.75, t: 0.5, play: -1 }));
    r.log.push(`rewound:${r.t.rewoundHome}`);
    r.t.stepCamBlend(1);                          // t clamps to 0
    r.log.push(`rewound:${r.t.rewoundHome}`);
    r.t.landWrapHome();
    return [r.log, `blend=${r.t.blend}/wrap=${r.t.railWrap}/disagree=${r.t.cameraStateDisagree}`];
  },
  /* ENTRY — the hero's two travel terms: armed, held through the jump's own
     placement passes, snapped by a real one, eased, reversed by a steered lap,
     cleared by a cancellation, and relaxed back on COPY_IN_K. */
  entry(factory) {
    const r = makeRig(factory, { heroShown: 0.8, presence: 1 });
    r.t.armHeroExit(false);
    r.log.push(`exiting:${r.t.heroExiting}`);
    r.log.push(`exit:${n3(r.t.stepHeroExit(0))}`);      // placeAt pass 1, held
    r.log.push(`exit:${n3(r.t.stepHeroExit(0))}`);      // placeAt pass 2, held
    r.log.push(`exit:${n3(r.t.stepHeroExit(0))}`);      // a REAL placement: snap
    r.log.push(`exiting:${r.t.heroExiting}`);
    r.setShown(0.02); r.t.armHeroExit(true);            // nothing up to retire
    r.log.push(`exiting:${r.t.heroExiting}`);
    r.setShown(0.8); r.t.armHeroExit(true);             // a wrap: the 0.6 s beat
    r.log.push(`exit:${n3(r.t.stepHeroExit(0.15))}`);
    r.t.armHeroEntry('mission', 1);                     // arming clears the exit
    r.log.push(`exiting:${r.t.heroExiting}`);
    r.log.push(`entry:${n3(r.t.stepHeroEntry(0.85))}`); // past the 0.55 lead
    r.t.setHeroEntryPlay(-1);
    r.log.push(`entry:${n3(r.t.stepHeroEntry(0.1))}`);  // the lap, rewinding
    r.log.push(`entry:${n3(r.t.stepHeroEntry(1))}`);    // back past its own start
    r.t.armHeroEntry('inspire', 1);                     // not the hero: no arrival
    r.t.armHeroEntry('mission', 1);
    r.t.cancelHeroEntry();                              // the visitor took the wheel
    r.log.push(`entry:${n3(r.t.stepHeroEntry(0.1))}`);  // ...so the gate relaxes
    r.log.push(`entry:${n3(r.t.stepHeroEntry(0))}`);    // a placement is not an arrival
    return [r.log, `exiting=${r.t.heroExiting}`];
  },
};

const runScenario = (factory, name) => {
  const [log, state] = SCENARIOS[name](factory);
  return [...log, `>> ${state}`];
};

pin('E0', 'D46 CONTROL — the controller compiled out of its own text is the SAME controller: all five scenarios trace identically against the imported module',
  (i) => Object.keys(SCENARIOS).sort()
    .map((n) => `${n}:${runScenario(i.imported, n).join('|') === runScenario(i.compiled, n).join('|')}`),
  { imported: CTRL.createTransitionController, compiled: compileController(SRC.controller) },
  ['cancellation:true', 'entry:true', 'landing:true', 'reversal:true', 'rewind:true'],
  'without this row the E-mutants below would be mutating a text nobody ships');

pin('E1', 'ENDPOINT — a click blend steps on the camera\'s own eased clock, publishes the rail phase, and LANDS: the state and the camera agree again, the chapters are told, and the grade goes back to being a function of p',
  (i) => runScenario(i.f, 'landing'),
  { f: compileController(SRC.controller) },
  ['mission.setBlending(true,9.000,1.000)', 'final.setBlending(true,9.000,1.000)',
    'cam.fov', 'lens.setLookOverride(look)',
    'mid:0.500/0.500/true',
    'lens.setLookOverride(look)',
    'lens.setLookOverride(null)',
    'mission.setBlending(false,undefined,undefined)', 'final.setBlending(false,undefined,undefined)',
    'mission.snapLanding',
    '>> blend=null/entry=final/disagree=false'],
  'endCamBlend(true) — a naturally landed chapter entry KEEPS its own visible reveal clock, which is the one thing a landing does that a cancellation does not');

pin('E2', 'CANCELLATION — a null claim decides nothing; a live one drops the blend, hands the copy envelope back, clears the entry clock, and restores the hero pose because the director is UN-OWNED',
  (i) => runScenario(i.f, 'cancellation'),
  { f: compileController(SRC.controller) },
  ['paintHero(0.000)', 'claim:null', 'claim:1',
    'director.restoreHero', 'lens.setLookOverride(null)',
    'mission.setBlending(false,undefined,undefined)', 'final.setBlending(false,undefined,undefined)',
    'mission.snapLanding', 'ui.cancelCopyEntry',
    '>> blend=null/entry=null/disagree=false'],
  '2026-08-14, Hannah\'s stuck hero: a blend cancelled while the director is UN-OWNED had no writer, so the camera stayed wherever the lap had reached. restoreHero is that fix, and this is the row that holds it');

pin('E3', 'REVERSAL — the lap retraces its own path: play flips ONCE, the copy envelope and the hero term reverse with it, and the chapters are re-told the move\'s NEW landing and its remaining room',
  (i) => runScenario(i.f, 'reversal'),
  { f: compileController(SRC.controller) },
  ['paintHero(0.000)', 'cam.fov', 'lens.setLookOverride(look)',
    'ui.setCopyEntryPlay(-1)',
    'mission.setBlending(true,1.000,1.000)', 'final.setBlending(true,1.000,1.000)',
    'play:-1', 'hero:0.000',
    '>> play=-1/rewound=false'],
  '2026-08-16: a down-wrap that rewinds is an arrival back INTO the field, not a departure from it. The second steer is a no-op — a same-way gesture must not re-announce');

pin('E4', 'REWIND AND LANDING HOME — a fully rewound lap is recognised only once its clock reaches zero, and landing places the journey back on the rest it departed, hero first so the capture cannot bake a lap frame',
  (i) => runScenario(i.f, 'rewind'),
  { f: compileController(SRC.controller) },
  ['rewound:false', 'director.applyHeroPose', 'cam.fov', 'lens.setLookOverride(look)',
    'rewound:true',
    'lens.setLookOverride(null)',
    'mission.setBlending(false,undefined,undefined)', 'final.setBlending(false,undefined,undefined)',
    'director.restoreHero', 'placeAt(0.750)', 'paintHero(0.000)',
    '>> blend=null/wrap=null/disagree=false'],
  'landWrapHome runs at the TOP of spineFrame, never inside stepCamBlend: placeAt composes a whole frame, and landing mid-applyFrame would re-drive every reader at the stale destination p');

pin('E5', 'ENTRY — the departure term survives exactly the jump\'s own two placement passes and then snaps, refuses to arm over nothing, and is cleared by an arrival; the arrival term eases past its lead, reverses with a steered lap, and relaxes back when the visitor takes the wheel',
  (i) => runScenario(i.f, 'entry'),
  { f: compileController(SRC.controller) },
  ['exiting:true', 'exit:0.800', 'exit:0.800', 'exit:0.000', 'exiting:false',
    'exiting:false',
    'exit:0.717', 'paintHero(0.000)', 'exiting:false',
    'entry:0.500', 'entry:0.210', 'entry:0.000',
    'paintHero(1.000)', 'paintHero(0.000)',
    'entry:0.240', 'entry:1.000',
    '>> exiting=false'],
  'every number here is the authored law, not an observation blessed: holdSnaps is 2 because placeAt runs TWO dt = 0 applyFrame passes and the third is a REAL placement; 0.717 is 0.8 x (1 - smootherstep(0.15/0.6)); 0.500 and 0.210 are smootherstep past the 0.55 lead over the 1 + 0.15 - 0.55 body; 0.240 is COPY_IN_K x 0.1');

/* ------------------------------------------------------------------ *
 * F — the manifest entry.                                             *
 * ------------------------------------------------------------------ */
console.log('\nF — the source manifest');

pin('F1', 'X3 — journey/transition/controller.js is in the source manifest, between its NAMED neighbours symbols/render.js and transport.js',
  (i) => {
    const m = i.src.match(/"journey\/symbols\/render\.js",\s*\n\s*"([^"]+)",\s*\n\s*"journey\/transport\.js",/);
    return m ? m[1] : 'NOT ADJACENT';
  }, { src: SRC.baseline }, 'journey/transition/controller.js');

pin('F2', 'X3 — this order added exactly one manifest entry and touched nobody else\'s',
  (i) => (i.src.match(/"journey\/transition\/[a-z-]+\.js",/g) || []).length,
  { src: SRC.baseline }, 1);

/* ------------------------------------------------------------------ *
 * G — this suite, audited (D44 / D76 / D86).                          *
 * ------------------------------------------------------------------ */
console.log('\nG — this suite, audited');

const PIN_TOKEN = maskedToken('p' + 'in');
const LIT_RE = literalPredicateRe(['L.same', PIN_TOKEN.whole], 2);
const LIT = literalPredicateHits(SRC_SELF, LIT_RE);
L.same('G1', 'D44 — bare-literal-predicate assertions in this suite', LIT.hits.length, 0,
  LIT.hits.join('\n        '));
L.same('G2', 'D46 — control: the D44 pattern DOES fire on a bare literal',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', true);"), true);
L.same('G3', 'D46 — control: it does NOT fire on a real comparison',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', a.length, 3);"), false);
L.same('G4', 'D45 — the D44 scan read this whole file, not a fragment', LIT.lineCount > 300, true);
L.same('G5', 'D76 — this self-scan MASKS its own token, so its stored rows are not occurrences it counts',
  [PIN_TOKEN.whole.length, SRC_SELF.includes("maskedToken('p' + 'in')")], [3, true]);

const TAUT = scanTautologyAst(SRC_SELF, new Map([['L.same', 2], [PIN_TOKEN.whole, PIN_RECEIVER]]));
L.same('G6', 'D86 — syntactic tautologies in this suite', TAUT.hits, [], TAUT.hits.join('\n        '));
L.same('G7', 'D86 — the AST pass reached this suite\'s call sites (a zero means the scan went blind, not that the file is clean)',
  [TAUT.sites > 0,
    TAUT.sites === REGISTRY.size + selfSiteSet('x', SRC_SELF, /(?:^|[^.\w$])L\.same\(/, null).length],
  [true, true]);
L.same('G8', 'D86 — control: the pass DOES fire on the shape a text scan cannot see',
  scanTautologyAst("L.same('X', 'what', 8, 8);", new Map([['L.same', 2]])).hits.length, 1);
L.same('G9', 'D76 — pin() call sites counted in this file equal the registry size',
  selfSiteSet('tools/test-transition.mjs', SRC_SELF,
    new RegExp(`^${PIN_TOKEN.head}${PIN_TOKEN.tail}\\(`), PIN_TOKEN.whole).length, REGISTRY.size);

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST. It targets a REAL pin
     (E1) and perturbs a field E1's reader does not read. The registry must
     score it CANNOT FAIL; a sweep that "kills" this is scoring noise and
     every [red] below it would be uninterpretable. */
  const CTL = sweep([
    M('E1', 'D88 NULL CONTROL — a field E1\'s reader does not read is perturbed', null,
      (i) => ({ ...i, unreadDecoy: 'moved' })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['E1']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  /* Every E-mutant below perturbs THE CONTROLLER'S OWN SOURCE TEXT, which E0
     proves is the shipped module. They are changes somebody could really
     make to journey/transition/controller.js. */
  const bend = (tag, from, to) => (i) => ({ ...i, f: compileController(mutateText(SRC.controller, tag, from, to)) });

  const MUTANTS = [
    M('A1', 'the controller takes the MODEL instead of the port — E-A2 collapses', [0, 1, 3],
      (i) => ({ ...i, deps: [...i.deps, 'scroll'].sort() })),
    M('A2', 'a transition module names `scroll` — the identifier is back in scope', [0],
      (i) => ({ ...i, transition: `${i.transition}\nconst z = scroll.progress;` })),
    M('A3', 'journey.js looks the port up a second time', [0],
      (i) => ({ ...i, journey: `${i.journey}\nconst z = inputPortOf(other);` })),
    M('B1', 'a diagnostic getter creeps back into the transition slice', [0],
      (i) => ({ ...i, transition: `${i.transition}\nconst z = m.gesturePeak;` })),
    M('B2', 'the blind-spot fixture stops being blind — the row would then be claiming a coverage the backstop does not have', [1],
      (i) => ({ ...i, fixtures: [i.fixtures[0], 'const x = m.sinceInput;', i.fixtures[2]] })),
    M('C1', 'a transition `let` is left behind in journey.js', [1],
      (i) => ({ ...i, journey: `${i.journey}\n  let camBlend = null;` })),
    M('C2', 'journey.js reaches a member the controller does not publish', null,
      (i) => ({ ...i, journey: `${i.journey}\n  transition.rawSinceInput;` })),
    M('C3', 'the claim is HOISTED to the top of applyFrame and reused — design.md §12\'s class of change', [1],
      (i) => ({ ...i,
        journey: i.journey.replace('if (transition.blend) {\n      const claim = transition.blendCancelled();',
          'const claim = transition.blendCancelled();\n    if (transition.blend) {') })),
    /* D1's oracle runs the SAME sliced body down both sides, so a mutation
       of that body cancels — measured: `dir === wrapDir` loosened to `>=`
       leaves the row green, because both sides loosen together. The axis this
       row is sensitive to is THE SUBSTITUTION, and this is the mutant of it:
       the claim stops carrying the model's own lastDir. That is exactly
       boundaries.md §A.8's "never a re-derivation from position", and it is
       the only way the two sides can come apart. */
    M('D1', 'the claim stops carrying the model\'s own lastDir and re-derives a direction', [0],
      (i) => ({ ...i, manualClaim: (d) => CLAIM.manualClaim(-d) })),
    M('D2', 'an axis of the grid is trimmed', [0, 3],
      (i) => ({ ...i, plays: i.plays.slice(1) })),
    M('D3', 'a claim arrives unfrozen — the envelope stops being frozen at construction', [0],
      (i) => ({ ...i, manualClaim: (d) => ({ dir: d > 0 ? 1 : d < 0 ? -1 : 0 }) })),
    M('D4', 'the port and the model disagree about direction on one live state', [0],
      (i) => ({ ...i, obs: i.obs.map((o, j) => (j === 1 ? { ...o, dir: -o.dir } : o)) })),
    M('E0', 'the compile silently drops the module\'s trailing half, so a mutant of the text would prove nothing', null,
      (i) => ({ ...i, compiled: compileController(SRC.controller.replace('    setBlending(false);\n    snapChapterLandings(chapters, guarded);', '    setBlending(false);')) })),
    M('E1', 'the landing stops keeping the chapter entry clock — a visible reveal that was allowed to outlive its camera flight is killed at the landing', null,
      bend('E1', '    if (!keepEntry) chapterEntry = null;', '    chapterEntry = null;')),
    M('E2', 'cancellation stops restoring the hero pose while the director is UN-OWNED — Hannah\'s stuck hero, returning', null,
      bend('E2', '    if (!director.owned) guarded(\'director\', () => director.restoreHero());\n    // The grade goes back',
        '    if (director.owned) guarded(\'director\', () => director.restoreHero());\n    // The grade goes back')),
    M('E3', 'a same-way steer stops being idempotent — the chapters are re-told a landing that did not change', null,
      bend('E3', '    if (play === camBlend.play) return;', '    if (play === camBlend.play && false) return;')),
    M('E4', 'the rewind lands one frame early — rewoundHome fires while the lap is still travelling', null,
      bend('E4', 'camBlend.play < 0 && camBlend.t <= 0', 'camBlend.play < 0 && camBlend.t <= 1')),
    M('E5', 'the departure term is given one held snap instead of two — the jump\'s own second placement pass kills it', null,
      bend('E5', 'holdSnaps: 2 }', 'holdSnaps: 1 }')),
    M('F1', 'the entry is filed away from its named neighbours', null,
      (i) => ({ ...i, src: i.src.replace('    "journey/transition/controller.js",\n', '') })),
    M('F2', 'a second transition entry appears in the manifest', null,
      (i) => ({ ...i, src: i.src.replace('"journey/transition/controller.js",', '"journey/transition/controller.js",\n    "journey/transition/extra.js",') })),
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
