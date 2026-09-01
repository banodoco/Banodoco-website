// C03a — the deterministic rendering baseline, pinned.
//
//   node tools/test-render-baseline.mjs
//
// Every assertion here is a CHARACTERIZATION of what the tree does. Nothing is
// asserted as desirable; several assertions pin a value a later wave may
// deliberately want to move.
//
// ==================================================================
// THE THREE PIN CLASSES — read this before "fixing" a failure here
// ==================================================================
// Coordinator decision D34. Not every pinned number means the same thing, and
// treating them alike is how a suite becomes noise that people route around.
//
//   check()    INVARIANT. This value should be STABLE. It is an RNG stream, a
//              shader hash, a baked byte length, the renderOrder ladder, a
//              declared `unmeasured` hole, or the report contract itself. A
//              change is a BEHAVIOUR change and needs a named owner. Never
//              loosened, never converted to a range.
//
//   wave()     WAVE-GATE BASELINE. A static-source SITE COUNT. These are
//              inherently unstable across this program, because the program's
//              whole purpose is to split files, add disposal and attach
//              cleanup. They are refreshed DELIBERATELY at each accepted wave
//              seam, with before/after and the causing order recorded in
//              README.md "Re-baselining log". Their value is detecting
//              UNEXPECTED change — a count that moves with NO order claiming
//              it. So: before assuming a regression, look for the owner.
//
//   floor()    MONOTONIC. The count must never DECREASE. Used only where the
//   ceiling()  program has a DECLARED DIRECTION OF TRAVEL — cleanup is being
//              added, so `removeEventListener`, `cancelAnimationFrame` and
//              `dispose()` may grow freely but must never shrink. ceiling()
//              is the mirror, used for the add/remove IMBALANCE, which must
//              never widen. A monotonic pin survives legitimate growth while
//              still catching regression; an absolute pin is STRONGER where
//              the value should be stable, so these are used sparingly and
//              deliberately, never reflexively.
//
// >>> RE-BASELINING PROTOCOL (same convention as C01's limitations.md §10).
//   1. Re-read docs/code-health/evidence/2026-08-21-elegance-run-01/c03a/
//      README.md and confirm the change is intended and has a named owner.
//   2. Regenerate: node tools/render-report-generate.mjs --out <evidence>/
//      render-baseline.json
//   3. Update the pin below, KEEPING IT EXACT, in the SAME commit as the
//      change, and append a row to README.md "Re-baselining log" recording
//      old -> new and the causing order.
// Never loosen an INVARIANT into a range to make a failure go away. A pin that
// has been widened no longer detects the drift it exists to detect.
//
// This suite READS ONLY: no server, no browser, no regenerated artifact.

import { buildReport, canonical } from './render-report-lib.mjs';

let pass = 0;
let fail = 0;
const failures = [];
const advisories = [];

const GUIDANCE = {
  invariant:
    'INVARIANT — this value is expected to be STABLE. A change here is a '
    + 'behaviour change. Find the accepted order that claims it before '
    + 'touching this pin; if none does, THAT is the finding.',
  wave:
    'WAVE-GATE BASELINE — a static-source site count or manifest, refreshed at '
    + 'each accepted wave seam. This is very likely a legitimate change, NOT a '
    + 'regression. Take the ADDED/REMOVED entries above and check each against '
    + 'the accepted orders; then re-baseline per README.md "Re-baselining log". '
    + 'An entry NO order claims is the finding.',
  floor:
    'MONOTONIC FLOOR — this may grow freely but must never SHRINK. Something '
    + 'named above used to exist and no longer does, which means cleanup was '
    + 'removed — a regression against the direction this program is travelling. '
    + 'Restore it, or get the removal explicitly accepted.',
  ceiling:
    'MONOTONIC CEILING — this imbalance must never WIDEN. It may shrink '
    + 'freely. A widening means something was attached without its teardown.',
};

function record(ok, cls, id, what, failDetail, passNote) {
  if (ok) { pass++; console.log(`  PASS  ${id}  [${cls}]  ${what}${passNote ? '  — ' + passNote : ''}`); return true; }
  fail++;
  failures.push(`${id}  [${cls}]  ${what}\n        ${failDetail}\n        >>> ${GUIDANCE[cls]}`);
  console.log(`  FAIL  ${id}  [${cls}]  ${what}`);
  console.log(`        ${failDetail}`);
  console.log(`        >>> ${GUIDANCE[cls]}`);
  return false;
}

const show = (v) => (typeof v === 'object' ? canonical(v).trim() : String(v));

/** INVARIANT — should be stable; any change needs a named owner. */
function check(id, what, actual, expected) {
  const a = show(actual);
  const e = show(expected);
  return record(a === e, 'invariant', id, what, `expected: ${e}\n        actual:   ${a}`);
}

/** WAVE-GATE BASELINE — a static-source site count, refreshed at wave seams. */
function wave(id, what, actual, expected) {
  const a = show(actual);
  const e = show(expected);
  return record(a === e, 'wave', id, what, `baseline: ${e}\n        actual:   ${a}`);
}

// NOTE: the scalar floor() helper this suite originally carried is GONE. Every
// monotonic floor is now a manifestFloor() over a SET of sites (D36), because
// a count floor passes when one site is deleted and another added elsewhere.
// If a future pin genuinely needs a scalar floor, reintroduce it — but check
// first that a set is not simply better.

/** Set difference, rendered for a human. This is the whole point of D36: a
 *  manifest pin turns a re-baseline chore into an attribution report. */
function delta(actual, expected) {
  const a = new Set(actual);
  const e = new Set(expected);
  const added = [...a].filter((x) => !e.has(x)).sort();
  const removed = [...e].filter((x) => !a.has(x)).sort();
  const lines = [`${expected.length} entries expected, ${actual.length} actual`];
  if (added.length) {
    lines.push(`ADDED (${added.length}) — is each one claimed by an accepted order?`);
    for (const x of added) lines.push(`          + ${x}`);
  }
  if (removed.length) {
    lines.push(`REMOVED (${removed.length}) — a removal a growing COUNT would have masked:`);
    for (const x of removed) lines.push(`          - ${x}`);
  }
  return lines.join('\n        ');
}

const sameSet = (a, b) => a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

/** WAVE-GATE MANIFEST — pins the SET, not its size. On mismatch it names
 *  exactly which entries appeared and which vanished (D36). Preferred over a
 *  bare count wherever the set is small enough to stay legible. */
function waveManifest(id, what, actual, expected) {
  return record(sameSet(actual, expected), 'wave', id, what,
    delta(actual, expected), `${actual.length} entries, set unchanged`);
}

/** MONOTONIC MANIFEST FLOOR — every entry recorded in the baseline must STILL
 *  BE PRESENT. Strictly stronger than a count floor, which passes when one
 *  entry is deleted and another added elsewhere. Growth is reported, not
 *  failed, because this program's direction of travel is to add cleanup. */
function manifestFloor(id, what, actual, expected) {
  const a = new Set(actual);
  const gone = expected.filter((x) => !a.has(x)).sort();
  const grew = actual.filter((x) => !expected.includes(x)).sort();
  const ok = record(gone.length === 0, 'floor', id, what,
    `${gone.length} recorded site(s) have VANISHED — cleanup that used to exist is gone:\n        `
    + gone.map((x) => `- ${x}`).join('\n        '),
    `all ${expected.length} recorded site(s) still present${grew.length ? `, +${grew.length} new` : ''}`);
  if (ok && grew.length) {
    advisories.push(`${id}  ${what}: ${grew.length} NEW site(s) beyond the recorded set — `
      + `${grew.join('; ')}. Not a failure; fold them into the baseline at the next wave seam.`);
  }
  return ok;
}

/** MONOTONIC CEILING — must never increase. Shrinkage is reported, not failed. */
function ceiling(id, what, actual, max) {
  const ok = record(actual <= max, 'ceiling', id, what,
    `${actual} is ABOVE the ceiling of ${max}`, `${actual} <= ceiling ${max}`);
  if (ok && actual < max) {
    advisories.push(`${id}  ${what}: ${actual} has improved past the recorded ceiling of ${max}. `
      + 'Not a failure — but lower the ceiling at the next wave seam so the ratchet keeps its grip.');
  }
  return ok;
}

const report = await buildReport();
const streamOf = (id) => report.rng.streams.find((s) => s.id === id);
const costOf = (id) => report.rng.derivedDrawCosts.find((c) => c.id === id);

/* ================================================================== *
 * R — the seeded RNG. The single most load-bearing baseline: every    *
 *     baked byte in static/geom/ is a function of these streams.      *
 * ================================================================== */
console.log('\nR — RNG stream identity and draw order');

check('R1', 'organism/random.js LCG seed', streamOf('organism.random.rand').seed, 1337);
check('R2', 'organism/random.js first three draws',
  streamOf('organism.random.rand').prefix.slice(0, 3),
  ['0.7542255679145455', '0.5495009317528456', '0.2744938782416284']);
check('R3', 'organism/random.js 4096-draw stream digest',
  streamOf('organism.random.rand').digest,
  '0f80ed937a18497d5972e740e0d265d269dfc2a18a6e9ee887b2f8b4c65938c9');

check('R4', 'journey/anatomy.js makeRng default seed', streamOf('journey.anatomy.makeRng.default').seed, 20260802);
check('R5', 'journey/anatomy.js first three draws',
  streamOf('journey.anatomy.makeRng.default').prefix.slice(0, 3),
  ['0.3590586318168789', '0.3051929632201791', '0.5531720414292067']);
check('R6', 'journey/anatomy.js 4096-draw stream digest',
  streamOf('journey.anatomy.makeRng.default').digest,
  '196dd3553cdb63d98cf6026e8a224c5248c114f63ccf96fc74300ae1c4dcad9b');

check('R7', 'journey/lib/helpers.js rng(1) 4096-draw digest',
  streamOf('journey.helpers.rng.seed1').digest,
  'f47f1a78623236fd451287cef33ee03b0b3efb9a208c4ec3fe453564565571d6');
check('R8', 'journey/lib/helpers.js rng(1337) 4096-draw digest',
  streamOf('journey.helpers.rng.seed1337').digest,
  '45cf8f37b401d8a30e60e40cfcbcda2923727338252d366a923be5fa93f20b24');

// DRAW ORDER: how many base draws a derived helper consumes. Change this and
// every downstream value shifts even though the generator is untouched.
check('R9', 'gauss() consumes exactly four rand() draws', costOf('organism.random.gauss').consumesBaseDraws, 4);
check('R10', 'randRange() consumes exactly one rand() draw', costOf('organism.random.randRange').consumesBaseDraws, 1);
check('R11', 'anatomy gaussOf() consumes exactly four draws', costOf('journey.anatomy.gaussOf').consumesBaseDraws, 4);

// The noise permutation is module-private; this digest is its only public
// consequence and pins it indirectly.
check('R12', 'helpers noise3/fbm3 lattice digest',
  report.rng.noisePermutationWitness.digest,
  '4fd94f5bb7ab5ccba2ba06a3bbd2acfc71c2a9af99b1d02eefac622f1878d7ab');

// The spores stream cannot be executed from Node — pinned from source text.
check('R13', 'organism/spores.js private stream seed', streamOf('organism.spores.makeRng.9127').seed, 9127);
check('R14', 'organism/spores.js private stream is NOT executed here (declared, not faked)',
  streamOf('organism.spores.makeRng.9127').derivation, 'static-source');
// R15/R16 assert the pin is REALLY IN THE FILE — searched, not assumed. An
// earlier draft compared the report's pin text to the same literal written
// here, which is a tautology that passes even when the pin has stopped
// describing the tree. It is written this way deliberately.
const sporePin = streamOf('organism.spores.makeRng.9127').sourcePin;
// R03 re-baseline (2026-08-21, coordinator-authorized scope extension):
// organism/spores.js gained ownership/teardown machinery for
// registerDrift()'s attachments (+59 net lines, all inserted BEFORE both
// pinned lines below — confirmed by `git diff -U0`: no hunk falls inside
// the original [614,718] span these two lines lived in). Both lines are
// still present, verbatim, exactly once each; only their line numbers
// moved, uniformly, by the same +59. R03's own suite
// (tools/test-spores-lifecycle.mjs, checks 1a-1c) proves organism/
// spores.js's EXECUTABLE RNG stream (ctx.rand()/gauss(), consumed by
// createSpores()'s construction, shedSpores(), and the drift integrator)
// is bit-identical to git show 6967a36ab309af7057336be64d6f0f9dd3c41b21:
// organism/spores.js, with a positive control proving that comparison can
// fail. The private makeRng(9127) stream these two lines pin is, as
// before, not independently executed here (see R14) — its unchanged
// behaviour rests on the same byte-identity this diff already
// establishes: the hunk boundaries prove the [614,718] region, including
// both pinned lines and everything between them, is untouched source
// text, not merely re-verified text.
//
// RE-BASELINED AGAIN at accepted commit e3fee95. Inspire's exit geometry
// moved into inspire-exits.js and spores.js now consumes that shared contract
// by named physical slot. The expanded FIL_SEED_T initialization adds four
// lines before both source pins, moving them uniformly +4 while leaving both
// pinned statements verbatim and unique. tools/test-spores-lifecycle.mjs is
// the executable equivalence control for the stream and lifecycle behavior.
check('R15', 'organism/spores.js really carries both pinned lines, once each',
  sporePin.lines.map((l) => [l.text, l.present, l.occurrences, l.atLines]),
  [['const randT = makeRng(9127);', true, 1, [781]],
    ['return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };', true, 1, [679]]]);
// R16 re-baselined 027ead4f...94cc5b5 -> e0250ca7...4767e4 by R03
// (2026-08-21-elegance-run-01) — organism/spores.js's registerDrift()
// attachments gained an owned, idempotent dispose() (see
// docs/code-health/evidence/2026-08-21-elegance-run-01/r03/README.md).
// e3fee95 then replaced anonymous exit arrays/indices with the accepted shared
// Inspire exit contract. That is a real source change with the same authored
// values and explicit slot identities, so the whole-file hash moves exactly
// once here and remains an invariant against the next unclaimed edit.
//
// RE-BASELINED 2156a5aa...c589b9c -> 4e108a17...6e2e1e2e: the driver seat's
// drive() gained one optional `surge` key (a per-exit arc bump folded into
// the plume-brightness feed). +26/-3 in organism/spores.js, all of it below
// the two lines R15 pins, which is why R15's [781]/[679] are NOT re-baselined
// alongside it — this is the whole-file hash moving for a real source change,
// not a line-number pin complying with one.
check('R16', 'organism/spores.js sha256', sporePin.fileSha256,
  '4e108a172f9c205105f67711b40ac997c7736b352669be8a3fb724a16e2e1e2e');
check('R17', 'RNG stream count', report.rng.streams.length, 5);

/* ================================================================== *
 * S — shader sources and uniform names.                               *
 * ================================================================== */
console.log('\nS — shader source hashes and uniform names');

const chunk = (n) => report.shaders.exportedChunks.find((c) => c.name === n);
check('S1', 'DRAW_GLSL source hash', chunk('DRAW_GLSL').sha256,
  '0660158745d756c63f0a331aebc223608dc5b2d620124d512bf97c521443a682');
check('S2', 'DRAW_GLSL length', chunk('DRAW_GLSL').length, 849);
check('S3', 'DRAW_GLSL uniform names', chunk('DRAW_GLSL').uniforms, ['uClampY', 'uProg', 'uWin']);
check('S4', 'DRAW_GLSL attribute names', chunk('DRAW_GLSL').attributes, ['aDraw']);
check('S5', 'PULSE_GLSL source hash', chunk('PULSE_GLSL').sha256,
  '943de8ad28eb4ec338173963c058471d12db6b1dbd23df02ea80a2ccee894eec');
check('S6', 'PULSE_GLSL length', chunk('PULSE_GLSL').length, 820);
check('S7', 'PULSE_GLSL uniform names', chunk('PULSE_GLSL').uniforms, ['uPulseC', 'uPulseP', 'uPulseT']);

wave('S8', 'ShaderMaterial slot count', report.shaders.materialSlotCount, 48);
check('S9', 'every slot resolved to source text', report.shaders.unresolvedSlotCount, 0);
/* ------------------------------------------------------------------ *
 * RE-BASELINED BY LANE B (2026-08-30) — organism/hero-spores.js, the
 * text-side descending spore band. Seven pins move for ONE new module and
 * one two-line edit to organism/animation.js, and every delta below is
 * that module's own; nothing else in the tree changed shape.
 *
 * WHAT THE MODULE IS, because that is what makes the deltas readable: a
 * dependency-free WebGL point layer that paints the hero's atmosphere
 * while `three` is still on the wire (index.html loads it on its own
 * script tag ahead of main.js), and the same particles rebuilt as a
 * THREE.Points inside the scene once the scene exists. It is the first
 * module in this tree that talks to WebGL WITHOUT going through three,
 * which is why it lands in three censuses that were built around three's
 * own vocabulary — see S12/S14 and M1 for exactly how.
 * ------------------------------------------------------------------ */
// S10 10 -> 12: hero-spores.js's own VERT and FRAG. Two chunks, one module,
// and they are the whole of this delta.
// S10 12 -> 14 (hero-loading v3, R5): the same module's LINE_VERT and
// LINE_FRAG — the PreNetwork's raw-GL line pair, carrying the identical
// fog and ACES delta-encode as the point pair so a skeleton strand lands
// on the pixel value the real web's strand will land on. They declare NO
// new uniform names (uTanHalfFov/uAspect/uBgLinear/uBgEncoded, all already
// in the unions), which is why S12-S15 are byte-unchanged by the same edit.
wave('S10', 'named GLSL chunk count', report.shaders.glslChunkCount, 14);
wave('S11', 'uniform binding block count', report.shaders.uniformBindingBlockCount, 24);
// S12/S13 — THE NAME MANIFESTS, not their size (coordinator decision D36, the
// same conversion X3 records below and for the same reason).
//
// WHAT THESE PINS ARE FOR. The uniform name union is the seam between the JS
// that BINDS uniforms and the GLSL that DECLARES them, and nothing else in this
// suite reads that seam whole: S3/S7 pin the names of the two EXPORTED chunks,
// S14/S15 pin the two cross-check RESIDUES either side of it, and every inline
// ShaderMaterial slot in journey/ and organism/ — 48 of them — was covered by
// nothing but these two totals. So they are this tree's only census of which
// uniforms exist, and their wave class says what the census is for: catching a
// change to it that NO ORDER CLAIMS.
//
// WHY THE SHAPE CHANGED, AND IT IS MEASURED RATHER THAN ARGUED. A size cannot
// do the job that sentence describes. `133 -> 135` says two arrived; it cannot
// say WHICH two, and the case that matters is worse than that: a RENAME, or a
// balanced swap (a uniform dropped in one material and another added in a
// different one), leaves the total untouched and the pin green. Measured on
// this tree, not asserted — `uArrive` renamed throughout portraits.js and
// nothing else changed, run against a count-shaped S12/S13 already bumped to
// 135/132: BOTH PINS PASS (evidence: c03a/rebaseline-2026-08-26-uniform-
// manifest.txt, run A). The manifest below fails the same mutant and names the
// entry that left and the one that arrived.
//
// RE-BASELINED IN THE SAME BREATH AS THE CHANGE, so it is named as such. The
// two entrants are ORB-ARRIVAL's and nobody else's: `uArrive` and `uArriveSpan`
// (journey/chapters/owned/portraits.js:636-637, declared :690, read :713-724) —
// the seconds-denominated per-face arrival clock and its span. Both unions
// gained exactly those two and lost nothing, diffed name-by-name against a
// `git archive HEAD` stage where the counts are still 133/130. No golden is
// owed and none was touched: uArrive RESTS AT 1, every frozen capture path
// renders the settled state, and both owned goldens are bit-identical at MAE
// 0.0000 (orb-arrival/README.md §5). A bare bump would have been this pin
// complying with the change it exists to police (CONTRIBUTING.md §1); the
// manifest refresh states which two names arrived and keeps the seam readable.
// RE-BASELINED at the 2026-08-28 release wave: `uNavPocketPx` is the
// screen-space ellipse shared by Final's strand materials. It is declared in
// STRAND_FRAG and bound by makeUniforms(), then written from the same Purpose
// navigator geometry used by CSS/camera composition. Both manifests gained
// exactly this one name and neither residue below moved: 135 -> 136 declared,
// 132 -> 133 bound.
const UNIFORM_NAMES_DECLARED = [
  'fogFar', 'fogNear', 'map', 'tDiffuse', 'tHistory', 'time', 'uAberration', 'uActive',
  'uActiveAmt', 'uAdosHubAlong', 'uAdosShift', 'uAmount', 'uAnon', 'uArrive', 'uArriveSpan',
  // Lane B: hero-spores.js's four, now FIVE — see `uPxScale` below. They are
  // RAW-GL uniforms, set through gl.getUniformLocation/gl.uniform1f/3f rather
  // than a three material's `uniforms` block, which is why S14 below gains
  // them as residue too.
  'uAspect', 'uBase', 'uBaseA', 'uBgEncoded', 'uBgLinear', 'uBuried', 'uCellAP', 'uClampY', 'uCol', 'uCol2', 'uColDeep', 'uColGold',
  'uColHot', 'uColor', 'uCore', 'uCoreMute', 'uCta', 'uCtaOn', 'uDeSepia', 'uDwell', 'uEarth',
  'uExit', 'uExposure', 'uFade', 'uFadeOn', 'uFar', 'uFlow', 'uFocusOn', 'uFocusUv',
  'uFogDensity', 'uFogFar', 'uFogNear', 'uFrom', 'uFront', 'uFrontOn', 'uGain', 'uGrain',
  'uGrainAmt', 'uGrainSeed', 'uGroundAdosDelta', 'uGrow', 'uHairAmp', 'uHalation', 'uHaze',
  'uHead', 'uHot', 'uHoverA', 'uHoverAmt', 'uHoverIdx', 'uImgMute', 'uLift', 'uLit', 'uLitMax',
  'uMap', 'uMapA', 'uMapA2', 'uMapB', 'uMapH', 'uMapH2', 'uMapP', 'uMapP2', 'uNavPocketPx',
  'uNear', 'uOpacity',
  'uOwner', 'uOwnerAmt', 'uPartAmp', 'uPhoto', 'uProg', 'uPull',
  // R3b (organism/hero-spores.js): the preload layer's device grid over the
  // scene renderer's. Both halves of the seeding stream write gl_PointSize in
  // DEVICE pixels, and the two halves pick their pixel ratio independently
  // (this layer caps at COMPOSITION[mode].dpr; the scene takes
  // createPixelRatioPolicy().initial, i.e. the verdict remembered for the
  // display) — so the stream changed size in one frame at adoption for every
  // returning visitor and on every phone. Raw-GL, hence the S14 residue.
  'uPxScale',
  'uPulse', 'uPulseAmp',
  'uPulseC', 'uPulseColor', 'uPulseHead', 'uPulseOn', 'uPulseP', 'uPulseT', 'uPulseWidth',
  'uQuiet', 'uQuietTier', 'uReach', 'uRes', 'uResolution', 'uRevIn', 'uRim', 'uRouteAmp',
  'uScale', 'uSelAmt', 'uSelIdx', 'uSize', 'uSoft', 'uSoilCol', 'uSoilOn', 'uSolid', 'uSurge',
  'uSwap', 'uSwapFlare', 'uSwapSpan', 'uTanHalfFov', 'uTime', 'uTipW', 'uTrace', 'uTraceAmp',
  'uTwinkle', 'uVarA', 'uVarB', 'uVarC', 'uVarD', 'uVarM', 'uVarMI', 'uVignette', 'uW', 'uWaveAmt',
  'uWaveC', 'uWaveR', 'uWaveW', 'uWell', 'uWidth', 'uWin', 'uWind', 'uWobA', 'uWobB', 'uWobId',
  'uWobR',
];
/* The BOUND union differs from the declared one by exactly the two residues
   S14/S15 pin — `uOwner`, `uOwnerAmt`, `uVarM`, `uVarMI` are declared and never
   bound; `uPullRaw` is bound and never declared — which is why it is written
   out rather than derived from the list above: a derivation would restate
   S14/S15's claim instead of independently carrying it. */
const UNIFORM_NAMES_BOUND = [
  'fogFar', 'fogNear', 'map', 'tDiffuse', 'tHistory', 'time', 'uAberration', 'uActive',
  'uActiveAmt', 'uAdosHubAlong', 'uAdosShift', 'uAmount', 'uAnon', 'uArrive', 'uArriveSpan',
  'uBase', 'uBaseA', 'uBuried', 'uCellAP', 'uClampY', 'uCol', 'uCol2', 'uColDeep', 'uColGold',
  'uColHot', 'uColor', 'uCore', 'uCoreMute', 'uCta', 'uCtaOn', 'uDeSepia', 'uDwell', 'uEarth',
  'uExit', 'uExposure', 'uFade', 'uFadeOn', 'uFar', 'uFlow', 'uFocusOn', 'uFocusUv',
  'uFogDensity', 'uFogFar', 'uFogNear', 'uFrom', 'uFront', 'uFrontOn', 'uGain', 'uGrain',
  'uGrainAmt', 'uGrainSeed', 'uGroundAdosDelta', 'uGrow', 'uHairAmp', 'uHalation', 'uHaze',
  'uHead', 'uHot', 'uHoverA', 'uHoverAmt', 'uHoverIdx', 'uImgMute', 'uLift', 'uLit', 'uLitMax',
  'uMap', 'uMapA', 'uMapA2', 'uMapB', 'uMapH', 'uMapH2', 'uMapP', 'uMapP2', 'uNavPocketPx',
  'uNear', 'uOpacity',
  'uPartAmp', 'uPhoto', 'uProg', 'uPull', 'uPullRaw', 'uPulse', 'uPulseAmp', 'uPulseC',
  'uPulseColor', 'uPulseHead', 'uPulseOn', 'uPulseP', 'uPulseT', 'uPulseWidth', 'uQuiet',
  'uQuietTier', 'uReach', 'uRes', 'uResolution', 'uRevIn', 'uRim', 'uRouteAmp', 'uScale',
  'uSelAmt', 'uSelIdx', 'uSize', 'uSoft', 'uSoilCol', 'uSoilOn', 'uSolid', 'uSurge', 'uSwap',
  'uSwapFlare', 'uSwapSpan', 'uTime', 'uTipW', 'uTrace', 'uTraceAmp', 'uTwinkle', 'uVarA',
  'uVarB', 'uVarC', 'uVarD', 'uVignette', 'uW', 'uWaveAmt', 'uWaveC', 'uWaveR', 'uWaveW',
  'uWell', 'uWidth', 'uWin', 'uWind', 'uWobA', 'uWobB', 'uWobId', 'uWobR',
];
waveManifest('S12', 'declared uniform names (137; WAS the bare size, 133)',
  report.shaders.uniformNameUnion, UNIFORM_NAMES_DECLARED);
waveManifest('S13', 'bound uniform names (133; WAS the bare size, 130)',
  report.shaders.uniformBindingNameUnion, UNIFORM_NAMES_BOUND);
// The two cross-check residues below are EXTRACTOR SCOPE, not defects — see
// limitations.md §2c. They are pinned so a NEW residue is visible.
/* S14 RE-BASELINED BY LANE B, and this one is an INVARIANT, so it is
   spelled out rather than bumped. The residue exists because the extractor
   pairs GLSL `uniform` DECLARATIONS against three's `uniforms: { ... }`
   BINDING blocks. organism/hero-spores.js binds through raw WebGL —
   gl.getUniformLocation() then gl.uniform1f/3f — so its four names are
   declared where the extractor can see them and bound where it cannot.
   That is extractor scope, the same class as the four names already here
   (limitations.md 2c), not four unbound uniforms.
   WIDENED BY ONE at R3b: `uPxScale`, the fifth raw-GL name in that same
   module — declared in its VERT, bound in boot() through
   gl.getUniformLocation and written from sizeCanvas() through
   gl.uniform1f. Same extractor blind spot, same class, one more name.
   WHAT THE PIN STILL CATCHES is unchanged: a TENTH entry means a uniform
   declared in a three material and never bound, which is the defect this
   row exists for. Widening it by five named raw-GL entries does not
   loosen that test; leaving it failing forever would. */
check('S14', 'declared-but-not-bound residue', report.shaders.declaredButNeverBound,
  ['uAspect', 'uBgEncoded', 'uBgLinear', 'uOwner', 'uOwnerAmt', 'uPxScale', 'uTanHalfFov',
    'uVarM', 'uVarMI']);
check('S15', 'bound-but-not-declared residue', report.shaders.boundButNeverDeclared, ['uPullRaw']);
check('S16', 'compiled program text is declared unmeasured, not faked',
  report.shaders.compiledProgram.derivation, 'unmeasured');

/* ================================================================== *
 * G — geometry: attribute counts and byte lengths.                    *
 * ================================================================== */
console.log('\nG — geometry attribute counts and byte lengths');

const disk = report.geometry.bakedOnDisk;
const chapter = (id) => disk.chapters.find((c) => c.chapter === id);

check('G1', 'baked manifest version', disk.manifestVersion, 1);
/* RE-BASELINED 2026-08-24 by the Ownership pass, and it IS a behaviour change —
   the pin's own message asks for the accepted order that claims it, so: contributor
   site 13 moved in portraits.js REST_SITES from [-0.84,-0.68,6.2,0.46] to
   [-0.86,-0.52,7.0,0.45]. The navigator docked bottom-left on 2026-08-19 and the
   rail-exclusion mask had been deleting that face from render AND hit model on every
   landscape viewport ever since, while its authored mirror stood — the asymmetry the
   site owner reported. The hole entered owned@1440x900 silently in that day's re-bless.

   Corroboration that only positions moved: owned.bin's byte length (2320088) and key
   count (21) are UNCHANGED below, and connect/final/inspire re-baked byte-identical to
   their recorded hashes — so the bake is deterministic and this delta is one chapter's
   geometry, not a toolchain drift. */
check('G2', 'baked manifest sha256', disk.manifestSha256,
  '1a0dda2a09f786ed8fc2b647a99e0700b9bb8e3fcd79c8b620887de2e58b1ab5');
check('G3', 'baked chapter count', disk.chapterCount, 4);
check('G4', 'baked key count', disk.totalKeyCount, 50);
check('G5', 'baked attribute count', disk.totalAttrCount, 251);
check('G6', 'total baked bytes', disk.totalBakedBytes, 4940912);

for (const [id, bytes, keys, sha] of [
  ['connect', 315888, 2, 'cf610e19cd107a57d3928d875b78e03ab35aa8992ee95c31ddb409e959a9ce29'],
  ['final', 2223988, 16, 'c9ababa77505a974d6c641462da5f4ad32d08618e9c6e1ffada910828aba454f'],
  ['inspire', 80948, 11, '604e3855456819136e7e24dd34021cb6a11f77895fdc2a4cfa8c5641a59e05e9'],
  ['owned', 2320088, 21, '9332b00f5bbe7a896f2e85532e234b1464a21f17b841a6669497b8463f4fcb3e'],  // site 13 — see G2
]) {
  const c = chapter(id);
  check(`G7.${id}`, `${id}.bin byte length`, c.byteLength, bytes);
  check(`G8.${id}`, `${id} key count`, c.keyCount, keys);
  check(`G9.${id}`, `${id}.bin sha256 on disk`, c.actualSha256, sha);
  check(`G10.${id}`, `${id} manifest sha256 matches the bytes`, c.sha256Matches, true);
  check(`G11.${id}`, `${id} attrs tile the file with no gap`, c.attrsContiguous, true);
  check(`G12.${id}`, `${id} attrs cover the file exactly`, c.coversFileExactly, true);
  check(`G13.${id}`, `${id} every byteOffset is 4-aligned`, c.allOffsets4Aligned, true);
}

// The largest single attribute in the tree, pinned by exact byte length —
// this is the value a geometry change moves first.
const ownedFan = chapter('owned').keys.find((k) => k.key === 'owned/fan');
check('G14', 'owned/fan attribute names', ownedFan.attrNames, ['position', 'aAlong', 'aStrand']);
check('G15', 'owned/fan position byteLength', ownedFan.attrs.find((a) => a.name === 'position').byteLength, 224208);
check('G16', 'owned/fan position itemCount', ownedFan.attrs.find((a) => a.name === 'position').itemCount, 18684);

// EXECUTED: journey/lib/baked.js's real read path over the committed bytes.
const rebuilt = report.geometry.bakedRebuilt;
check('G17', 'baked.js rebuilds every key', rebuilt.geometries.length, 50);
check('G18', 'baked.js reports every chapter baked',
  rebuilt.isBaked.every((c) => c.baked), true);
check('G19', 'rebuilt attribute byte total', rebuilt.totalArrayByteLength, 4878800);

const recon = report.geometry.diskVsRebuiltReconciliation;
check('G20', 'manifest and read path agree on the key set', recon.keySetsEqual, true);
check('G21', 'the only attrs the read path moves off .attributes are the 3 indices',
  recon.attrCountDifferenceIsIndexOnly, true);
check('G22', 'and the byte difference is exactly those indices', recon.byteDifferenceIsIndexOnly, true);
check('G23', 'indexed geometries', recon.indexedGeometries,
  [{ key: 'final/soil', indexCount: 3816 },
    { key: 'owned/ceiling', indexCount: 11616 },
    { key: 'owned/planes', indexCount: 96 }]);

// EXECUTED: a live builder, headless. Pins the packing contract itself.
const b = report.geometry.builders.cases;
check('G24', 'strandLines(7, seed 1, 2pts) attribute shape',
  b[0].attrs.map((a) => [a.name, a.count, a.arrayByteLength]),
  [['aAlong', 84, 336], ['aStrand', 84, 336], ['position', 84, 1008]]);
check('G25', 'strandLines(7, seed 1, 2pts) position bytes digest', b[0].positionDigest,
  'ac33ecc9e25cb80d8bad3dddc8177520f8299443f2d58dd5fb673f3dc0d261f2');
check('G26', 'strandLines(23, seed 1337, 8pts) attribute shape',
  b[2].attrs.map((a) => [a.name, a.count, a.arrayByteLength]),
  [['aAlong', 368, 1472], ['aStrand', 368, 1472], ['position', 368, 4416]]);
check('G27', 'strandLines(23, seed 1337, 8pts) position bytes digest', b[2].positionDigest,
  'c33eff1dbc3b54aa4a92d3d15955ea9603e54f5f25ca2eddedbb086fabfb22d8');
check('G28', 'the same count/points at a different seed yields different bytes',
  b[0].positionDigest !== b[1].positionDigest, true);

/* ================================================================== *
 * D — draw ranges and draw order.                                     *
 * ================================================================== */
console.log('\nD — draw ranges and draw order');

check('D1', 'no source site narrows a draw range', report.drawRanges.setDrawRangeSiteCount, 0);
check('D2', 'every rebuilt geometry starts its draw range at 0',
  report.drawRanges.observedDefaults.allStartZero, true);
check('D3', 'every rebuilt geometry draws its full count (drawRange.count === Infinity)',
  report.drawRanges.observedDefaults.allCountInfinity, true);
check('D4', 'the runtime draw range is declared unmeasured, not faked',
  report.drawRanges.runtimeDrawRange.derivation, 'unmeasured');

wave('D5', 'renderOrder assignment sites', report.drawOrder.renderOrderSiteCount, 19);
wave('D6', 'of which are literal', report.drawOrder.literalAssignmentCount, 17);
wave('D7', 'and non-literal (a variable, so the value is unknown statically)',
  report.drawOrder.nonLiteralAssignmentCount, 2);
check('D8', 'distinct literal renderOrder values',
  report.drawOrder.distinctLiteralValues, [-30, -10, -7, -6, -5, -4, -3, -2, 1, 2]);
check('D9', 'GPU submission order is declared unmeasured, not faked',
  report.drawOrder.submissionOrder.derivation, 'unmeasured');

/* ================================================================== *
 * M — material flags, lifecycle, resource owners.                     *
 * ================================================================== */
console.log('\nM — material flags, lifecycle, resource owners');

// Material-flag counts are WAVE-GATE baselines: there is no declared
// direction of travel for "more or fewer transparent: sites", so a floor or a
// ceiling would encode a preference the program has not stated. They also
// STAY COUNTS rather than becoming D36 manifests: 238 sites, and the matched
// text is repetitive boilerplate (`transparent: true,` appears dozens of
// times identically), so a set would be neither unique nor legible. The
// per-file breakdown is in the report for anyone who needs to localise one.
//
// M1 RE-BASELINED 238 -> 237 by order J01, 2026-08-22, and the entry that
// left is a PHANTOM rather than a material flag — D101, measured again here.
// The scanner drops a line that starts with `//` or `*`, which makes it blind
// to prose inside a `/* */` block indented with plain spaces. journey.js's
// blendCancelled() carried exactly one such line:
//
//     full. Same call, same destination, traced side by side: the QA hook
//
// — where "side by side:" matched `\bside\s*[:=]`. J01 deleted
// blendCancelled(); the same fifty-one-line rationale stands in
// journey/claim.js, where its ` *  ` leaders ARE filtered, so the site does
// not reappear there and the total is one lower rather than unchanged.
// ONE entry left, no entry arrived, and it is attributed. M2/M3/M4 are
// unmoved, which is the cross-check that no real flag site was touched.
// 237 -> 238 (J02, 2026-08-22). ONE entry arrived, none left, and it is a
// REAL site rather than a D101 phantom: journey/frame/publication.js's
// `const fog = sceneApi.scene.fog;`, which the `fog` pattern counts exactly
// as it counts journey.js's own two. The publication reads fog.near/fog.far
// to copy them onto the frozen pose. Measured per file before re-baselining:
// `fog` 14 -> 15, the whole of the delta, with publication.js contributing
// exactly 1 and journey.js still contributing 2. M2/M3/M4 unmoved, which is
// again the cross-check that no real flag site elsewhere was touched.
// 238 -> 237 (the instrument-diet order, 2026-08-22), and it is the D101/D143
// phantom LEAVING rather than a site vanishing. `grepSites` now scans the
// COMMENT-STRIPPED text and reports the raw line, so a call named inside a
// block comment can no longer match however it is indented. ONE entry left,
// none arrived, and it is attributed to the character: journey/ui.js:2912,
// `rule is \`.j-hot.label-hover > * { opacity: 0 }\` — dot, label and pad`, a
// block-comment CONTINUATION line with no leading `*`, which is precisely the
// shape `isCode` cannot see and precisely the shape this codebase writes.
// Measured per flag before re-baselining: `opacity` 46 -> 45, the whole of the
// delta; every other flag unmoved, M2/M3/M4 unmoved, which is the cross-check
// that no real flag site was touched. TWO earlier orders reworded PRODUCTION
// PROSE to make this census come out right (J04c at 70 -> 69, J04e's
// preparation-owner comment); neither needs to now.
//
// RE-BASELINED 237 -> 238 by order U05, 2026-08-22. Measured per flag: `side`
// 25 -> 26, the whole of the delta; every other flag unmoved and M2/M3/M4
// unmoved. THE SITE IS NOT A MATERIAL. `side` is one of this census's tracked
// names and it is also the name of the card's placement decision — the DOM
// attribute `card.dataset.side` and the string 'right'/'left'/'above'/'below'
// it carries. U05 lifted that decision into journey/ui/card-layout.js, where
// it is RETURNED from a pure resolver as `{ side, x, y }` instead of being
// assigned to a `let` and read back; the one extra site is the object-literal
// key `side:` in that return. The census's own warning says it detects that a
// flag site appeared or vanished and must never be used to assert what a
// material is, and this is exactly that case: a name collision with a
// three.js material flag, in a module that constructs no material and imports
// no three. It is folded in rather than avoided by renaming, because renaming
// production to satisfy a name-collision census is the move the note above
// records twice and declines to repeat.
const flag = (n) => report.materialFlags.perFlag.find((f) => f.flag === n).siteCount;
// RE-BASELINED 238 -> 237 by the navigation restage, 2026-08-26. Measured
// per flag: `opacity` down by exactly 1, every other flag unmoved, M2/M3/M4
// unmoved — the cross-check that no real material site was touched. THE SITE
// IS NOT A MATERIAL: it was journey/rail.js's `const opacity = edge <= 2 ...`
// in the half-moon follower's per-slot loop — the edge-fade the moon used to
// carry a mark round its hidden back. That loop was retired with the moon's
// choreography (owner: "when I scroll between sections the labels
// disappear"; the loop's write powered the legacy `.j-rail-following` rule
// that blanked a row item at the mid-leg wrap seam), so the site left the
// tree with the defect it was feeding.
// RE-BASELINED 240 -> 241 at accepted commit e3fee95. The sole delta is
// `opacity` 43 -> 44 in journey/ui/hotspot-frame.js. It is not a material:
// `const opacity = hotspotIconTabOpacity(u, departing)` is the three-channel
// DOM marker paint resolved for direct-navigation departure. M2/M3/M4 remain
// unchanged, confirming no material construction flag moved.
/* M1 241 -> 246 (Lane B). Five sites, all in organism/hero-spores.js, and
   NOT ONE OF THEM IS A MATERIAL FLAG: four `opacity` (three CSS
   `style.opacity =` assignments plus `opacity:0` in the layer's inline
   stylesheet) and one `premultipliedAlpha` in a getContext() options
   object. This census is a text grep for flag NAMES over source, and its
   own `warning` field says so; the module is the first in the tree to
   spell those two words outside a three material. */
/* M1 246 -> 254 (R4, the pre-load overture). Eight sites, all in
   organism/hero-spores.js's createOverture(), and NOT ONE IS A MATERIAL
   FLAG: all eight are `style.opacity =` assignments on the overture's DOM
   glow elements — the breathing landing pool, the traveling light's
   envelope, and the layer's own entry/exit fades. Same extractor scope as
   Lane B's five directly above: this census greps flag NAMES over source,
   and a module that animates CSS opacity by hand spells the word a lot.
   S12-S15 are byte-unchanged by the same edit, confirming no shader or
   uniform moved — the overture is deliberately not a GL surface. */
/* M1 254 -> 255 (hero-loading v3, R5). The prelude rework REPLACED the
   overture's DOM glow (traveling light + pre-lit pool, 8 `opacity` sites)
   with the ground's landing-driven glow (per-site pools, activation-keyed
   ground wash, strike/dismiss fades, 9 `opacity` sites) — a net +1, all
   in organism/hero-spores.js's createGround(), and NOT ONE IS A MATERIAL
   FLAG: every one is a CSS `style.opacity` write or an `opacity:` in an
   inline stylesheet string, the same extractor scope as the two entries
   directly above. Measured per flag: `opacity` 55 -> 56; M2/M3/M4 and
   `premultipliedAlpha` unmoved — the cross-check that no real material
   site was touched. */
wave('M1', 'material flag site total', report.materialFlags.totalFlagSiteCount, 255);
wave('M2', 'transparent: sites', flag('transparent'), 33);
wave('M3', 'depthWrite: sites', flag('depthWrite'), 32);
wave('M4', 'blending: sites', flag('blending'), 33);
check('M5', 'resolved material state is declared unmeasured, not faked',
  report.materialFlags.resolvedMaterialState.derivation, 'unmeasured');

const lc = report.lifecycle.addRemoveBalance;
const lcSites = (call) => report.lifecycle.perCall.find((c) => c.call === call).sites;
// M6 STAYS A COUNT — deliberately, against D36's default preference for a
// manifest. 116 sites spread across ~30 files: a per-site set thrashes on any
// text edit, and a per-file map thrashes on any file split (X3 has already
// been re-baselined twice for exactly that). The information a manifest would
// add is carried better by M18's imbalance ceiling, which is the real
// invariant — an attach WITHOUT its teardown — and does not thrash at all.
// RE-BASELINED 116 -> 72 by order J04b (WAS: 116). The delta is -44 and every
// unit of it is J04b's, attributed per file rather than asserted:
//     -27  journey/ui.js   27 -> 0   (25 call sites -> owner.listen, plus the
//                                     two `{ matches: false, addEventListener() {} }`
//                                     fallback stubs, which moved to media.js)
//     -19  journey/rail.js 19 -> 0   (all 19 -> owner.listen)
//      +1  journey/ui/media.js       (the ONE shared fallback stub that
//                                     replaced four longhand ones)
//      +1  journey/ui/owner.js       (the single `target.addEventListener`
//                                     inside owner.listen — every converted
//                                     site now reaches the platform here)
// journey/backdrop.js's 4 are DELIBERATELY UNCONVERTED: M7's floor pins all
// four of its removeEventListener sites by text (lifecycle.md §6.3 calls that
// file the model). Full transcript: docs/code-health/evidence/
// 2026-08-21-elegance-run-01/j04b-ui/m6-attribution.txt.
//
// M6 STAYS A COUNT — deliberately, against D36's default preference for a
// manifest. 69 sites spread across ~20 files: a per-site set thrashes on any
// text edit, and a per-file map thrashes on any file split (X3 has already
// been re-baselined twice for exactly that). The information a manifest would
// add is carried better by M18's imbalance ceiling, which is the real
// invariant — an attach WITHOUT its teardown — and does not thrash at all.
//
// RE-BASELINED 72 -> 69 by order J04c, 2026-08-22 (WAS: 72). The delta is -3,
// and it is the whole of J04c's conversion, attributed per file:
//      -1  journey/dial.js                  1 -> 0  (the QA-only keydown ->
//                                                    owner.listen(globalThis, …))
//      -2  journey/chapters/final/index.js  2 -> 0  (the two document hooks ->
//                                                    globalHooks.listen(document, …))
// Nothing is ADDED: both files now reach the platform through the single
// `target.addEventListener` inside journey/ui/owner.js that J04b's +1 already
// records, so this delta is -3 and not -3+1.
//
// One thing worth carrying, because it cost a measurement: `isCode` above
// rejects only lines starting `//` or `*`, so a line INSIDE a block comment
// that names the call with its parenthesis is counted as a site (D101's
// shape). J04c's first draft read 70 for exactly that reason and the prose was
// reworded rather than the number accepted. A future re-baseliner who cannot
// account for one unit should look for a comment before looking for a bug.
//
// RE-BASELINED 69 -> 67 by order J04e, 2026-08-22 (WAS: 69). The delta is -2,
// and it is the whole of J04e's conversion, in one file:
//      -2  journey/journey.js  2 -> 0  (the `[g]` grade-toggle keydown ->
//                                       owner.listen(globalThis, …), and the
//                                       hero CTA click -> owner.listen(cta, …))
// Nothing is ADDED. Both sites now reach the platform through the single
// `target.addEventListener` inside journey/ui/owner.js that J04b's +1 already
// records, so this delta is -2 and not -2+1. `journey/journey-owner.js` is a
// new file and registers NO listener of its own — it composes that owner and
// adds an animator/property-claim pair, neither of which is a listener.
//
// D101 bit again and was caught by measurement, not by luck: J04e's first
// draft of the preparation-owner comment in journey/journey.js contained a
// block-comment continuation line naming a `.dispose()` call, which M16's
// scan counted as a site for exactly the reason recorded above. The prose was
// reworded.
//
// BOTH OF THOSE RE-WORDINGS WOULD BE UNNECESSARY TODAY, and the advice they
// left behind has been withdrawn. `grepSites` now scans comment-stripped text
// (D143) and M16's census parses (see `disposeCallSites` in
// render-report-lib.mjs), so no census here can count a comment as a call. A
// re-baseliner who cannot account for one unit should look for a bug.
//
// RE-BASELINED 67 -> 63 by order U06, 2026-08-23 (BASELINE-01) (WAS: 67). The
// delta is -4, all four in ONE file, and each is accounted for individually
// rather than as a total — because a count that falls when a leak is CLOSED
// and a count that falls when a feature STOPS REGISTERING are the same number
// and opposite facts, and only the per-site reading tells them apart:
//      -1  journey/ui/sheet-gesture.js :: grip.addEventListener('pointerdown', …)
//      -1  journey/ui/sheet-gesture.js :: grip.addEventListener('pointermove', …)
//      -1  journey/ui/sheet-gesture.js :: grip.addEventListener('pointerup', …)
//      -1  journey/ui/sheet-gesture.js :: grip.addEventListener('pointercancel', …)
// ALL FOUR ARE FIXED LEAKS, not lost registrations. Each became
// `owner.listen(grip, <the same event>, <the same handler>)` — verified by
// diffing the file across the seam: the four handler BODIES are byte-identical
// and the four event types and the `grip` target are unchanged. What changed
// is only that the registration is now known to `destroy()`. U06's gate read
// this on the REAL DOM in both trees: 4 listeners survived `destroy()` at
// 2a3407d, 0 survive now (D75 — count the DOM, don't ask the disposer).
// The same edit also converted this file's one raw `setTimeout` to
// `owner.timer`; that is the second leak U06 reported and it does not touch
// M6, which counts only `addEventListener`.
// Nothing is ADDED. All four now reach the platform through the single
// `target.addEventListener` inside journey/ui/owner.js that J04b's +1 already
// records, so this delta is -4 and not -4+1 — the same arithmetic J04c and
// J04e recorded above, for the same reason.
// U06's five NEW modules contribute nothing here in either direction:
// hotspot-frame, hover-zone, rail-mask, label-policies and frame-projection
// register NO listener of their own — they are placement, geometry and latch
// machines, and the listener work they were lifted away from was already going
// through owner.listen before the split. The per-file census is byte-unchanged
// in all 16 surviving files; sheet-gesture.js is the ONLY row that moved,
// 4 -> 0, and it is the only row that left the map.
// Transcript: baseline-01/m6-site-accounting.txt.
/* RE-BASELINED 63 -> 67 by the DISPOSAL REMOVAL, 2026-08-25. Four listener
   registrations stopped going through `owner.listen` and became raw
   `addEventListener` calls at their own sites: two in journey/journey.js (the
   `[g]` grade keydown on the global, the explore CTA's click) and two in
   journey/chapters/final/index.js (the chapter's `pointerover` and `focusin`
   document hooks). NOT four new listeners — the same four, spelled at the
   site instead of behind the funnel, because the funnel's only remaining job
   for them was a removal nothing performed. `journey/ui/owner.js x1` is still
   the funnel's own site and the fifteen files that still route through it are
   unchanged. See docs/code-health/DISPOSAL-REMOVED.md. */
/* Click-only touch travel adds the platform cancellation partner beside
   touchend so an interrupted gesture cannot leave its blocked state armed. */
/* M6 68 -> 69, THE SUM OF TWO CAMPAIGNS' DELTAS. Lane B and the Equip
   promotion both re-baselined this counter from 68, from different bases;
   they were integrated on 2026-08-30 and the pin below is the merged tree's
   own measurement, not either lane's number. Both accountings are kept
   because each one names sites the other never saw: +3 - 2 = +1.

   +3, LANE B. Three attaches, and all three arrive WITH their removers, so
   M18's zero-slack imbalance ceiling below is unmoved by this half —
   which is the row that would have caught an unpaired one.
     organism/hero-spores.js  resize          re-reads the hero composition
                                              for the new breakpoint
     organism/hero-spores.js  visibilitychange parks its own loop
     organism/animation.js    visibilitychange gates the composer while the
                                              document is hidden
   The matching removals are folded into M7's floor below.

   -2, THE EQUIP PROMOTION, and both removed sites are in main.js's
   hero-callout loop. Equip stopped being a deferred placeholder, so the two
   registrations that existed only to answer its absence went with it: a
   click handler whose whole body was `e.preventDefault()`, keeping the tag
   from navigating, and a hoverless-device toggle that lit the specimen's
   stem and revealed "coming soon" because a finger had no other way to reach
   that label. NOTHING IS ADDED — the EQUIP tag now takes the same
   `el.querySelector('.tag')` click site the INSPIRE and CONNECT callouts
   already shared inside the same loop, so the delta is -2 and not -2+1.
   tools/test-page-lifetime.mjs's B1 pin carries the two removed site texts
   verbatim; it is the per-site half of this count.

   M18 BELOW TAKES ONLY THE EQUIP HALF, 60 -> 58, for the same reason: Lane
   B's three attaches are paired and move the gap by nothing, while the two
   deletions were unpaired and narrow it by exactly two. */
wave('M6', 'addEventListener sites', lc.addEventListenerSites, 69);
// D36: WHERE the rAF sites are, as a file-level map. File-level rather than
// per-site because a line number shifts on unrelated edits, and rAF call text
// is often a bare `requestAnimationFrame(tick)` that repeats across files.
// RE-BASELINED by order J04b. WAS: `journey/rail.js x2` and no owner entry.
// The rail's two one-shot rAFs (the reveal's class flip, and the recentre
// class removal after an at-rest turn) now go through owner.raf, which
// requests through ONE site in journey/ui/owner.js and registers a matching
// cancelAnimationFrame — so M9's floor gains a site and M19's imbalance
// narrows 10 -> 8. This entry moved for the same edit that moved M6.
/* RE-BASELINED by order B01, 2026-08-23: the original eight rAF sites moved from
   main.js to journey/boot/handoff.js, unchanged in count and unchanged one by
   one. They are the journey-preparation machine's own — the nextTask() slicer,
   activateWhenIntroComplete's poll, the former scroll-replay handoff loop and
   the preboot-rail fade — and they went with the machine. The click-only
   journey later removed the two replay-poll sites because an early scroll is
   now a navigation cue, not progress. WAS (pre-B01):
   "journey/ui/owner.js x1", "main.js x8", ... A manifest is exactly the right
   pin for this: a bare count would have read 8 -> 8 and said nothing, while
   this one named both halves of the move.

   RE-BASELINED at the 2026-08-28 release wave, handoff.js x8 -> x6: the two
   removed sites were the nested `intro-depart` polling loop. That parallel
   paint owner caused the Intro copy to flash off/on around activation; the
   normal journey ticket now owns the fade, so no replacement polling loop is
   warranted. The other three files and all six surviving handoff sites are
   unchanged.

   The intro-local clock extraction adds organism/intro-clock.js's injectable
   default requestFrame implementation. Production setupIntro supplies its
   owned wrapper in organism/intro.js, whose matching cancel is pinned by M9;
   M19 below treats the default and injected implementations as alternatives,
   not two simultaneously live registrations. */
const RAF_SITES_BY_FILE = [
    "journey/boot/handoff.js x6",
    "journey/ui/owner.js x1",
    "organism/animation.js x1",
    /* Lane B: organism/hero-spores.js's preload loop. ONE site, on purpose
       — its hidden-tab gate parks and resumes through the same `schedule()`
       door rather than adding a second request, and the matching
       cancelAnimationFrame is in M9's floor below, so M19's zero-slack
       ceiling does not move. */
    "organism/hero-spores.js x1",
    "organism/intro-clock.js x1",
    "organism/intro.js x1",
  ];
waveManifest('M8', 'requestAnimationFrame sites by file',
  report.lifecycle.perCall.find((c) => c.call === 'requestAnimationFrame')
    .files.map((f) => `${f.file} x${f.count}`), RAF_SITES_BY_FILE);

// The CLEANUP counts are monotonic. This program's declared direction of
// travel is to add teardown, so these may grow freely and must never shrink.
// M7 was absolute at 7 and stays at 7 today; it is converted because the next
// cleanup order will legitimately raise it and an absolute pin would trip.
// D36: the SET of teardown sites, not how many. A count floor passes when one
// site is deleted and another added elsewhere; a set floor names the casualty.
// Site identity is `file :: trimmed source line` — NOT the line number, which
// shifts on any edit above it and would make the manifest thrash.
const REMOVE_LISTENER_SITES = [
    "journey/backdrop.js :: backdrop.removeEventListener('lostpointercapture', clear);",
    "journey/backdrop.js :: backdrop.removeEventListener('pointercancel', clear);",
    "journey/backdrop.js :: backdrop.removeEventListener('pointerdown', onPointerDown);",
    "journey/backdrop.js :: backdrop.removeEventListener('pointerup', onPointerUp);",
    /* RE-KEYED main.js -> journey/boot/handoff.js by order B01, 2026-08-23.
       The site TEXT is character-identical; the file it lives in changed,
       because the intro input capture went with the machine that owns it.

       THIS PIN DID ITS JOB and it is worth recording how: a monotonic FLOOR
       over a SET, not a count. It reported "1 recorded site has VANISHED —
       cleanup that used to exist is gone" and named the exact line, which is
       precisely the alarm a file move should trip and precisely what a count
       floor (still 7 either way) would have slept through. D36's set-not-count
       argument, paid off. The removal was verified present in its new home
       before this line was re-keyed, not assumed. */
    "journey/boot/handoff.js :: for (const type of INTRO_INPUT_EVENTS) removeEventListener(type, onIntroInput, true);",
    /* Folded in at the 2026-08-28 wave seam, as the floor's advisory
       prescribes. The media entry is the no-matchMedia fallback's contract;
       the spores pair are the real teardown partners for its page-lifetime
       pointer drift listeners. All three already existed in the accepted
       tree; recording them tightens the floor without changing production. */
    "journey/ui/media.js :: : { matches: false, addEventListener() {}, removeEventListener() {} };",
    "organism/spores.js :: offMouseLeave = () => document.removeEventListener('mouseleave', onMouseLeave);",
    "organism/spores.js :: offPointerMove = () => removeEventListener('pointermove', onPointerMove);",
    /* Folded in by Lane B, as this floor's advisory prescribes: the three
       removal partners for the three attaches M6 above records. Recording
       them is what stops a later edit dropping one and leaving the attach
       standing. */
    "organism/animation.js :: doc.removeEventListener('visibilitychange', onVisibility);",
    "organism/hero-spores.js :: document.removeEventListener('visibilitychange', onVisibility);",
    "organism/hero-spores.js :: if (onResize) { removeEventListener('resize', onResize); onResize = null; }",
    /* FLOOR LOWERED BY EXPLICIT ACCEPTANCE — DISPOSAL REMOVAL, 2026-08-25.
       This is the one thing this floor exists to refuse, and it is being
       done deliberately with the owner's decision behind it, not slipped
       past. TWO SITES WERE DROPPED, both in journey/chapters/final/interact.js:

         el.removeEventListener('pointerdown', onDown, OPT);
         el.removeEventListener('pointerup', onUp, OPT);

       They were the body of `interact.js`'s `dispose()`, whose only caller
       was Final's chapter disposer, whose only caller was the registry
       cascade, which had none. The two `addEventListener` calls they
       matched are still there and still counted by M6 — what went is the
       unreachable path back off, not the attachment.

       WHAT THIS COSTS, STATED: this floor can no longer say "every teardown
       that ever existed still exists," only "every teardown that exists
       today still exists tomorrow." The entry below is what the floor is
       now anchored on. docs/code-health/DISPOSAL-REMOVED.md carries the
       full per-suite account. */
  ];
manifestFloor('M7', 'every recorded removeEventListener site still exists',
  lcSites('removeEventListener'), REMOVE_LISTENER_SITES);

// M9 RE-BASELINED TWICE, both cleanup orders closing rAF leaks:
//   0 -> 1  order R01 (organism/animation.js — stop() cancels the tracked rAF)
//   1 -> 2  order R02 (organism/intro.js     — the ramp rAF is cancelled)
// The coordinator's own example of a direction pin: once above zero it must
// never drop back. R02's site was caught by this suite's ADVISORY channel —
// the floor passed (nothing vanished) and reported the new site rather than
// failing, which is precisely the behaviour a monotonic pin exists to give.
const CANCEL_RAF_SITES = [
    "organism/animation.js :: cancelAnimationFrame(rafId);",
    /* Folded in by Lane B: the preload spore layer's own loop cancel, the
       partner of M8's single request site above. Same trimmed text as
       animation.js's, different file, so the set distinguishes them. */
    "organism/hero-spores.js :: cancelAnimationFrame(rafId);",
    /* The local-clock extraction moved the ramp callback behind an injected
       requestFrame function. setupIntro still owns and cancels the exact
       platform id; only the binding name changed with that ownership seam. */
    "organism/intro.js :: cancelAnimationFrame(accelerationRaf);",
  ];
manifestFloor('M9', 'every recorded cancelAnimationFrame site still exists',
  lcSites('cancelAnimationFrame'), CANCEL_RAF_SITES);

// The IMBALANCE ceilings. These are the assertions that actually encode what
// the cleanup waves are for: an attach added WITHOUT its teardown widens the
// gap and fails, while an attach added WITH its teardown leaves it flat and
// passes. Strictly a SITE-COUNT PROXY — see limitations.md §2a; one site in a
// loop attaches many. It is a direction check, not a leak count.
// RATCHETED 110 -> 58 by order J04c, 2026-08-22. The ceiling had not moved
// since it was set, while the tree improved to 61 under J04a/J04b/R01/R02 —
// design.md §11 Q8 makes "ratchet M18 down after each conversion" a standing
// Wave-3 obligation and J04a's and J04b's rows both name it; neither took it,
// so 49 points of the 52 this ratchet removes are theirs and 3 are J04c's
// (69 attaches - 11 removals = 58, measured immediately before this edit).
// THIS IS THE ROW THAT NOW BITES: with no slack left, the next attach added
// without its teardown fails here on the day it lands, which is the whole
// purpose of the class. An order that legitimately adds a balanced pair
// leaves 58 exactly where it is.
// RATCHETED 58 -> 56 by order J04e, 2026-08-22: 67 attaches - 11 removals,
// measured immediately before this edit. J04c's ratchet left no slack and
// this one leaves none either, which is the row doing its job — J04e's two
// conversions removed two attaches and added no removal, so the gap closes by
// exactly two and the ceiling follows it down.
// RAISED 56 -> 59 by the DISPOSAL REMOVAL, 2026-08-25, and this is the only
// direction this class is not supposed to move, so it is spelled out. The gap
// widened for two reasons and neither is an unmatched attach:
//   +4  four `owner.listen` calls became raw `addEventListener` at their own
//       sites (see M6). The listener count is unchanged; the SITE count is not.
//   ... and -1 against that, because interact.js's two removals went (M7) while
//       its two attaches stayed, which widens the gap by 2 — net +3.
// The proxy is measuring what it always measured. What changed is that this
// tree no longer has a teardown direction to travel in: nothing disposes, so
// "an attach added without its teardown" is now every attach, and this ceiling
// can only detect NEW attach SITES. It is kept for that narrower job and its
// slack is again zero. docs/code-health/DISPOSAL-REMOVED.md.
// RAISED 59 -> 60, 2026-08-27: transport's page-lifetime touchcancel partner
// clears the same state as touchend after an OS/browser-cancelled contact.
// RATCHETED 60 -> 58 at the 2026-08-30 Equip seam, consuming the advisory the
// same edit raised. The two deleted hero-callout attaches (see M6) had no
// teardown partner — nothing in this tree does — so deleting them narrowed the
// gap by exactly two. Leaving the ceiling at 60 would have banked that as
// headroom for two future un-torn-down attaches, which is the one thing this
// ratchet exists to refuse. Lane B landed in the same 2026-08-30 integration
// and moves this row by NOTHING: its three new attaches (see M6) each arrive
// with a remover, so they raise both terms of the difference equally. 58 is
// the merged tree's measured gap, not a sum taken on faith.
ceiling('M18', 'listener attach/detach imbalance never widens',
  lc.addEventListenerSites - lc.removeEventListenerSites, 58);
// RATCHETED 11 -> 10 by order R02 (organism/intro.js — the ramp rAF is now
// cancelled). Lowering a ceiling when the tree improves is the maintenance
// this class requires: leaving it at 11 would silently re-permit the leak R02
// just closed. The suite emits an advisory when a ratchet has slack, which is
// how this one was noticed.
// RATCHETED 10 -> 7 at the 2026-08-28 wave seam: handoff's two parallel
// intro-depart polling requests were removed, and the accepted tree now has
// nine request sites against two cancellation sites. The advisory requires
// consuming that slack so a future request without a cancel cannot hide in it.
//
// The local clock now exposes a default requestFrame implementation for direct
// use, while setupIntro injects organism/intro.js's cancellable wrapper. Those
// two source sites are alternative implementations of ONE ramp request, not
// two requests made by the production intro. Exclude exactly the named default
// from the live-path proxy; if it moves or another alternative appears, this
// file entry stops matching and the zero-slack ceiling reds again; M8 pins the
// alternative's exact per-file count independently so this subtraction cannot
// silently absorb a second request site in that module.
const introClockAlternativeRequests = report.lifecycle.perCall
  .find((entry) => entry.call === 'requestAnimationFrame').files
  .find((entry) => entry.file === 'organism/intro-clock.js')?.count || 0;
const effectiveRafRequestSites = lc.requestAnimationFrameSites
  - introClockAlternativeRequests;
ceiling('M19', 'rAF request/cancel imbalance never widens',
  effectiveRafRequestSites - lc.cancelAnimationFrameSites, 7);
check('M10', 'live listener/rAF counts are declared unmeasured, not faked',
  report.lifecycle.liveCounts.derivation, 'unmeasured');

// D36: construction owners as a per-CLASS manifest rather than four bare
// group totals. `materials: 35` says nothing about WHICH owner appeared; a
// class map is four short lists and says exactly that. Class-level rather
// than per-site because construction lines repeat verbatim across chapters
// (`new THREE.BufferGeometry()` x32), so a per-site set would not be unique.
const cls = (g) => report.resourceOwners.groups[g].classes.map((c) => `${c.class} x${c.siteCount}`);
waveManifest('M11', 'geometry construction owners', cls('geometries'), [
    "BufferGeometry x32",
    "CylinderGeometry x1",
    "PlaneGeometry x1",
  ]);
waveManifest('M12', 'material construction owners', cls('materials'), [
    "LineBasicMaterial x2",
    "MeshBasicMaterial x3",
    "PointsMaterial x1",
    "ShaderMaterial x23",
    "SpriteMaterial x6",
  ]);
waveManifest('M13', 'texture construction owners', cls('textures'), [
    "CanvasTexture x6",
  ]);
waveManifest('M14', 'render target construction owners', cls('renderTargets'), [
    "WebGLRenderTarget x3",
  ]);
wave('M15', 'resource construction site total', report.resourceOwners.totalConstructionSiteCount, 78);
// dispose() is cleanup, so it is monotonic for the same reason as M7/M9.
// D36: dispose() is cleanup, so it is a manifest FLOOR for the same reason as
// M7/M9 — and Waves 3-4 will be adding disposal constantly, so knowing WHICH
// site vanished matters far more than knowing the total dropped.
//
// DERIVED BY PARSE, not by pattern (E02, 2026-08-23). The pattern it replaced
// was blind to `x?.dispose?.()`, which is the spelling a reader reaches for
// when a member may be absent — so the census could not see the very
// teardown it exists to watch. The site set and per-file counts came out
// byte-identical on the tree of that date; the difference is what it can see
// TOMORROW. Identity is unchanged: `file :: trimmed raw source line`.
/* FLOOR LOWERED BY EXPLICIT ACCEPTANCE — DISPOSAL REMOVAL, 2026-08-25.
   THREE SITES WERE DROPPED and all three were reachable only from a chapter
   disposer that nothing called:

     journey/chapters/final/clones.js  :: for (const g of ownedGeos) g.dispose();
     journey/chapters/final/ring.js    :: dispose() { picker.dispose(); clones.disposeFigures(); },
     journey/chapters/owned/index.js   :: dispose() { owner.dispose(); },

   The first two freed the 46 capfigure buffers the clone bodies own — the
   only GPU resource any disposer in this tree ever freed — and they are now
   held for the life of the page, which is how long the chapter that draws
   them lives anyway. The third was Owned's chapter disposer.

   WHAT SURVIVES BELOW IS THE PART THAT WAS NEVER PART OF THE MACHINERY:
   `portrait-textures.js` / `portrait-remix.js` free real GPU textures,
   `journey.js`'s `rt.dispose()` frees the warm-draw render target inside a
   `finally`, and `organism/organism.js` frees a render-target pair. Of those,
   only the last two have a live caller today; the portrait pair lost its one
   caller with Owned's disposer and is kept because it is resource disposal,
   not reachability — see docs/code-health/DISPOSAL-REMOVED.md, "what stayed". */
const DISPOSE_SITES = [
    /* Folded in at this seam: Connect's disposer is the one the removal could
       not take (its file was under a live order and off limits), and
       organism/renderer.js's pair is a page-lifetime leaf resource disposer
       that was never part of the chapter machinery — it frees the WebGL
       context and the orbit controls, and has no caller either. */
    "journey/chapters/connect/index.js :: dispose() { owner.dispose(); },",
    "journey/chapters/owned/portrait-textures.js :: texture.dispose();",
    "organism/renderer.js :: controls.dispose();",
    "organism/renderer.js :: renderer.dispose();",
    // A01a-2 relocated this site verbatim out of portraits.js into
    // portrait-remix.js, which now owns the arrangement/texture lifecycle.
    // Same statement, same behaviour, new file — the floor's identity is the
    // site, so the path is corrected rather than the entry dropped and re-added.
    "journey/chapters/owned/portrait-remix.js :: for (const texture of textures) if (texture && typeof texture.dispose === 'function') texture.dispose();",
    /* Folded in at the 2026-08-28 wave seam: portrait recomposition replaces
       one live strand geometry and disposes that exact outgoing leaf so its
       BufferAttributes' GPU buffers cannot be stranded. */
    "journey/chapters/owned/portraits.js :: outgoing.dispose();",
    "journey/journey.js :: rt.dispose();",
    "organism/organism.js :: dispose() { this.history.dispose(); this.quad.dispose(); }",
  ];
manifestFloor('M16', 'every recorded dispose() site still exists',
  report.resourceOwners.disposeSites, DISPOSE_SITES);
check('M17', 'live resource counts are declared unmeasured, not faked',
  report.resourceOwners.liveResourceCounts.derivation, 'unmeasured');

/* ================================================================== *
 * X — the report contract itself.                                     *
 * ================================================================== */
console.log('\nX — report schema contract');

check('X1', 'schema version', report.schemaVersion, '1.0.0');
check('X2', 'report kind', report.reportKind, 'deterministic-rendering-baseline');
// X3 — THE MANIFEST, not the size (coordinator decision D36).
//
// This pin used to be the scalar `fileCount`. A scalar answers "how many"
// and cannot answer the question a wave-gate pin exists to answer: are the
// new files CLAIMED? `84` tells you five appeared. It cannot tell you whether
// they are F01's five domain modules or five nobody owns. Worse, a count
// masks removals — one file deleted and two added nets +1 and reads as
// ordinary growth.
//
// So X3 now pins the sorted PATH SET, and on mismatch waveManifest() prints
// the set difference: exactly which paths were ADDED and which REMOVED. That
// turns a re-baseline chore into an attribution report.
//
// Content hashes are deliberately NOT pinned here. All 86 would trip on every
// edit by every concurrent order — the "genuinely too noisy" case. Content is
// pinned precisely where it is load-bearing instead: organism/shaders.js by
// S1/S5, organism/spores.js by R16, and every baked .bin by G9.
//
// RE-BASELINED TWICE so far, both module splits behind compatibility facades:
//   79 -> 84  order F01 (journey/constants.js -> journey/constants/*.js, 5 files)
//   84 -> 86  order F02 (journey/symbols.js   -> journey/symbols/{data,render}.js)
//   97 -> 100 order J04b (journey/ui/{owner,media,bands}.js — the lifecycle
//             owner, the shared matchMedia fallback, and the pure copy-band
//             curve, all out of journey/ui.js and journey/rail.js).
//             J04b ADDED ITS OWN THREE ENTRIES AND NOBODY ELSE'S: the 95->97
//             entries this file already carried are the ring.js split's and
//             were claimed by their own lane (D69).
//   110 -> 111 order J01 (journey/transition/controller.js — the transition
//             controller lifted out of journey/journey.js). ONE ENTRY, this
//             order's own, inserted in sort position between
//             journey/symbols/render.js and journey/transport.js. Nobody
//             else's row was added, moved or removed (D62).
//   111 -> 112 order J02 (journey/frame/publication.js — the immutable frame
//             publication lifted out of journey/journey.js's applyFrame).
//             ONE ENTRY, this order's own, inserted in sort position between
//             journey/frame-application.js and journey/journey.js. Nobody
//             else's row was added, moved or removed (D62).
//   112 -> 113 order J04e (journey/journey-owner.js — the journey's root
//             owner: the re-parking animator registration and the
//             page-lifetime property claim, composed onto journey/ui/owner.js
//             and lifted out of journey/journey.js's boot()). ONE ENTRY,
//             this order's own. Its sort position is BEFORE journey/journey.js
//             and not after it, because '-' (0x2D) sorts below '.' (0x2E);
//             that is the array's own order and not a typo. Nobody else's row
//             was added, moved or removed (D62).
//   113 -> 114 order U01b (journey/cards/registry.js — the card builder
//             registry: the six builder imports, the null-filtered
//             CARD_BUILDERS map and the CARD_ASSETS/REDUCE configuration
//             re-exports, lifted out of journey/cards/index.js into one
//             acyclic owner). ONE ENTRY, this order's own, inserted in sort
//             position between journey/cards/index.js and
//             journey/cards/runtime.js ('e' < 'u'). Nobody else's row was
//             added, moved or removed (D62). The run that added it had X3
//             reporting exactly one ADDED entry and nothing REMOVED.
//   114 -> 115 order U01c (journey/cards/icons.js — the card chip glyph data:
//             the `I()` factory and the CARD_ICONS table, lifted out of
//             journey/cards/index.js into one data-only owner). ONE ENTRY,
//             this order's own, inserted in sort position between
//             journey/cards/hivemind.js and journey/cards/index.js ('h' < 'i',
//             then 'c' < 'n' — "icons" sorts before "index"). Nobody else's
//             row was added, moved or removed (D62). The run that added it had
//             X3 reporting exactly one ADDED entry and nothing REMOVED.
//   115 -> 116 order U02 (journey/ui/hot-state.js — the hotspot and hover-zone
//             registry and the one owner of the three-channel hot state: the
//             two registry arrays, the recency counter, the hover/focus/arm
//             union latch and the DERIVED touch-arm, lifted out of
//             journey/ui.js). ONE ENTRY, this order's own, inserted in sort
//             position between journey/ui/dom.js and
//             journey/ui/label-policy.js ('d' < 'h' < 'l'). Nobody else's row
//             was added, moved or removed (D62). The run that added it had X3
//             reporting exactly one ADDED entry and nothing REMOVED.
//   116 -> 119 order U03 (journey/ui/{popover-tier,card-tier,selection}.js —
//             the two disclosure vessels and the one owner of the selected
//             light, the committed disclosure and the focus return, all
//             lifted out of journey/ui.js). THREE ENTRIES, all this order's
//             own, in sort position: card-tier between bands.js and dom.js
//             ('b' < 'c' < 'd'), popover-tier and selection between owner.js
//             and sheet-gesture.js ('o' < 'p' < 's', and "selection" <
//             "sheet" because 'e' < 'h'). Nobody else's row was added, moved
//             or removed (D62). The run that added them had X3 reporting
//             exactly three ADDED entries and nothing REMOVED.
//   119 -> 120 order U04 (journey/ui/copy-arrival.js — the copy choreography
//             and the arrival envelope: the eased opacities, the travel-speed
//             signal, the direct-navigation ticket, the jump-entry envelope,
//             the hero's arrival shelf and the two copy painters, all lifted
//             out of journey/ui.js). ONE ENTRY, this order's own, inserted in
//             sort position between journey/ui/card-tier.js and
//             journey/ui/dom.js ("card" < "copy" because 'a' < 'o'; then
//             'c' < 'd'). Nobody else's row was added, moved or removed (D62).
//             The run that added it had X3 reporting exactly one ADDED entry
//             and nothing REMOVED.
//   122 -> 127 order U06, 2026-08-23 (BASELINE-01) — the UI facade made
//             composition-only: `journey/ui/{hotspot-frame,hover-zone,
//             rail-mask,label-policies,frame-projection}.js`, five owners
//             lifted out of `journey/ui.js` (656 -> 318 code lines, `createUI`
//             18 mutable bindings -> 0, 33/33 traces byte-identical).
//             FIVE ENTRIES, all this order's own, each in sort position:
//               frame-projection  between dom.js and hot-state.js
//                                 ('d' < 'f' < 'h')
//               hotspot-frame     immediately after hot-state.js, because
//                                 '-' (0x2D) sorts below 's' (0x73)
//               hover-zone        immediately after hotspot-frame ('t' < 'v')
//               label-policies    immediately BEFORE label-policy.js: the two
//                                 first differ at 'i' (0x69) < 'y' (0x79), so
//                                 the plural sorts first. THE SINGULAR
//                                 SURVIVES — U06 added a module, it did not
//                                 rename the old one, and a near-identical
//                                 neighbour is exactly where a rename would
//                                 read as an addition. Both are in the tree.
//               rail-mask         between popover-tier.js and selection.js
//                                 ('p' < 'r' < 's')
//             NOTHING WAS REMOVED, and this was verified rather than inferred
//             from the absence of a REMOVED block: the committed tree at
//             2d231eb was walked with renderSources()'s own rules and its 122
//             paths diffed against both this pin (identical, 0 drift) and the
//             working tree (5 added, 0 removed, 0 moved). See
//             baseline-01/x3-manifest-audit.txt.
// Orders F02 and R02 were in flight when this was recorded, so X3 IS EXPECTED
// TO MOVE AGAIN before the wave gate. The next refresh is the gate owner's
// routine work, not a defect. Full log in README.md "Re-baselining log".
// The intro-local clock extraction adds organism/intro-clock.js and removes
// nothing. It is a real runtime owner imported once by organism/intro.js; its
// sort position precedes intro.js because '-' sorts before '.'.
const SOURCE_MANIFEST = [
    "flags.js",
    "journey/anatomy.js",
    "journey/backdrop.js",
    /* ADDED by order B01, 2026-08-23 — four entries, nothing removed, and
       every one of them a named owner lifted out of main.js: the failure
       story, the viewport mode and its five keyed tables, the queued chapter
       entry, and the journey preparation/handoff machine. main.js itself
       stays in this manifest below, at 330 code lines rather than 735. */
    "journey/boot/entry-queue.js",
    "journey/boot/handoff.js",
    "journey/boot/hero-mode.js",
    "journey/boot/scene-note.js",
    "journey/camera-blend.js",
    "journey/camera-path.js",
    "journey/cards/ados.js",
    "journey/cards/arca.js",
    "journey/cards/artcompute.js",
    "journey/cards/discord.js",
    "journey/cards/hivemind.js",
    "journey/cards/icons.js",
    "journey/cards/index.js",
    "journey/cards/registry.js",
    "journey/cards/runtime.js",
    "journey/cards/tworp.js",
    "journey/chapter-contract.js",
    "journey/chapter-entry.js",
    "journey/chapter-interactions.js",
    "journey/chapter-registry.js",
    "journey/chapters/connect/camera.js",
    "journey/chapters/connect/index.js",
    "journey/chapters/connect/tendrils-baked.js",
    "journey/chapters/connect/tendrils-materials.js",
    "journey/chapters/connect/tendrils.js",
    "journey/chapters/equip/camera.js",
    "journey/chapters/equip/index.js",
    "journey/chapters/final/camera.js",
    "journey/chapters/final/canopy-baked.js",
    "journey/chapters/final/canopy-levels.js",
    "journey/chapters/final/canopy-routes.js",
    "journey/chapters/final/canopy.js",
    "journey/chapters/final/capfigure.js",
    "journey/chapters/final/clones-materials.js",
    "journey/chapters/final/clones-tap.js",
    "journey/chapters/final/clones.js",
    "journey/chapters/final/index.js",
    "journey/chapters/final/interact.js",
    "journey/chapters/final/ring-baked.js",
    "journey/chapters/final/ring-primordia.js",
    "journey/chapters/final/ring.js",
    "journey/chapters/final/shed.js",
    "journey/chapters/final/sky.js",
    "journey/chapters/final/species.js",
    "journey/chapters/final/terrain-baked.js",
    "journey/chapters/final/terrain-section.js",
    "journey/chapters/final/terrain-soil.js",
    "journey/chapters/final/terrain.js",
    "journey/chapters/final/variation.js",
    "journey/chapters/final/world.js",
    "journey/chapters/hero-ground-dim.js",
    "journey/chapters/inspire/anatomy.js",
    "journey/chapters/inspire/camera.js",
    "journey/chapters/inspire/index.js",
    "journey/chapters/owned/camera.js",
    "journey/chapters/owned/index.js",
    "journey/chapters/owned/leg.js",
    "journey/chapters/owned/portrait-atlas.js",
    "journey/chapters/owned/portrait-deal.js",
    "journey/chapters/owned/portrait-paint.js",
    "journey/chapters/owned/portrait-photo-loader.js",
    "journey/chapters/owned/portrait-remix.js",
    "journey/chapters/owned/portrait-textures.js",
    "journey/chapters/owned/portraits.js",
    "journey/chapters/owned/substrate-baked.js",
    "journey/chapters/owned/substrate-ownership.js",
    "journey/chapters/owned/substrate.js",
    "journey/claim.js",
    "journey/constants.js",
    "journey/constants/camera.js",
    "journey/constants/copy.js",
    "journey/constants/fog.js",
    "journey/constants/hero.js",
    "journey/constants/scroll.js",
    "journey/dial.js",
    "journey/director.js",
    "journey/failure-guard.js",
    "journey/frame-application.js",
    "journey/frame/publication.js",
    /* 140 -> 141, order R11 2026-09-01 (journey/hero-field.js — the adopted
       hero spore field's presence gate: the owner ruling that the entry's
       spores belong to the FIRST SECTION and leave with it, expressed as one
       reader of the hero furniture's already-painted scalar rather than as a
       second envelope. It writes the field's own colour attribute, an
       orthogonal channel to the uOpacity that final/index.js captures and
       restores). ONE ENTRY, this order's own, inserted in sort position
       between frame/publication.js and journey-owner.js ('f' < 'h' < 'j').
       Nobody else's row was added, moved or removed (D62); the run that
       added it had X3 reporting exactly one ADDED entry and nothing
       REMOVED. */
    "journey/hero-field.js",
    "journey/journey-owner.js",
    "journey/journey.js",
    /* Added at the 2026-08-28 release wave: the one shared source of Final's
       phone lift and Purpose navigator clearance pocket. */
    "journey/layout/final-composition.js",
    "journey/layout/rail-geometry.js",
    "journey/lens.js",
    "journey/lib/baked.js",
    "journey/lib/ease.js",
    "journey/lib/helpers.js",
    /* Added at the same seam: route-pair speed policy, applied once at the
       existing camera-duration boundary. */
    "journey/navigation-timing.js",
    "journey/navigation.js",
    "journey/ownership.js",
    "journey/portrait.js",
    "journey/rail.js",
    "journey/road.js",
    "journey/route.js",
    "journey/scroll.js",
    "journey/seams.js",
    "journey/state.js",
    "journey/structure.js",
    "journey/symbols.js",
    "journey/symbols/data.js",
    "journey/symbols/render.js",
    "journey/transition/controller.js",
    "journey/transport.js",
    "journey/ui.js",
    "journey/ui/arrival-motion.js",
    "journey/ui/bands.js",
    "journey/ui/card-layout.js",
    "journey/ui/card-tier.js",
    "journey/ui/copy-arrival.js",
    "journey/ui/dom.js",
    "journey/ui/frame-projection.js",
    "journey/ui/hot-state.js",
    "journey/ui/hotspot-frame.js",
    "journey/ui/hover-zone.js",
    "journey/ui/label-policies.js",
    "journey/ui/label-policy.js",
    "journey/ui/live-region.js",
    "journey/ui/media.js",
    "journey/ui/owner.js",
    "journey/ui/popover-tier.js",
    "journey/ui/rail-handoff.js",
    "journey/ui/rail-mask.js",
    "journey/ui/selection.js",
    "journey/ui/sheet-gesture.js",
    "main.js",
    "organism/animation.js",
    "organism/furniture.js",
    /* 136 -> 137, order Lane B 2B (organism/hero-spores.js — the text-side
       descending spore band: a dependency-free WebGL preload layer and the
       same field rebuilt inside the scene, one integrator shared). ONE
       ENTRY, this order's own, in sort position between furniture.js and
       intro-clock.js ('f' < 'h' < 'i'). Nobody else's row was added, moved
       or removed (D62); the run that added it had X3 reporting exactly one
       ADDED entry and nothing REMOVED. */
    "organism/hero-spores.js",
    "organism/intro-clock.js",
    "organism/intro.js",
    /* 139 -> 140, the hero-loading v3 prelude (R5): organism/
       network-skeleton.js — the PreNetwork's shared ground data, a leaf
       extracted from the real groundGroup build (landing sites + 24 of
       the web's own polylines in world coordinates), so the prelude's
       skeleton and the loaded network are one structure rather than two
       aim tables that can drift. ONE ENTRY, this order's own, in sort
       position between intro.js and organism.js ('n' < 'o'). Nobody
       else's row was added, moved or removed (D62); the run that added
       it had X3 reporting exactly one ADDED entry and nothing REMOVED. */
    "organism/network-skeleton.js",
    "organism/organism.js",
    "organism/performance.js",
    "organism/random.js",
    "organism/renderer.js",
    "organism/shaders.js",
    "organism/spores.js",
  ];
waveManifest('X3', 'source inventory manifest',
  report.sourceInventory.files.map((f) => f.file), SOURCE_MANIFEST);
check('X4', 'the canonical payload carries no absolute path',
  canonical(report).includes('/Users/'), false);
check('X5', 'the canonical payload carries no ISO timestamp',
  /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(canonical(report)), false);
check('X6', 'every top-level section is present',
  Object.keys(report).sort(),
  ['canonicalization', 'drawOrder', 'drawRanges', 'geometry', 'lifecycle',
    'materialFlags', 'order', 'reportKind', 'resourceOwners', 'rng', 'run',
    'schemaVersion', 'shaders', 'sourceInventory']);

/* ================================================================== *
 * --demo-delta — the D36 demonstration.                               *
 *                                                                     *
 * A manifest pin's whole value is the failure message: it must NAME    *
 * the added and removed entries, not just report a size mismatch. An   *
 * unproven improvement is a claim, so this mode injects a synthetic    *
 * delta into each manifest's EXPECTED set and prints the real failure  *
 * output the suite would produce.                                      *
 *                                                                     *
 *   node tools/test-render-baseline.mjs --demo-delta                   *
 *                                                                     *
 * Nothing is written and no file is touched: the delta exists only in  *
 * the expected array passed to the assertion.                          *
 * ================================================================== */
if (process.argv.includes('--demo-delta')) {
  console.log('\n--demo-delta — the manifest failure messages, on an INJECTED delta');
  console.log('(each block below is a real FAIL, produced on purpose, to show what the');
  console.log(' message names. The tree itself is untouched and healthy.)\n');

  // X3: a synthetic TREE in which one file nobody claims has appeared and one
  // recorded file has vanished. A count would report this as 86 -> 86 and say
  // nothing at all; the manifest names both.
  const injectedTree = report.sourceInventory.files.map((f) => f.file)
    .filter((f) => f !== 'journey/symbols/data.js')
    .concat(['journey/ghost/unclaimed-module.js']);
  waveManifest('X3.demo', 'source inventory manifest (INJECTED DELTA)',
    injectedTree, SOURCE_MANIFEST);

  console.log('');
  // M7: pretend a recorded teardown site has been deleted.
  manifestFloor('M7.demo', 'removeEventListener sites (INJECTED DELTA)',
    lcSites('removeEventListener').filter((x) => !x.includes('lostpointercapture')),
    REMOVE_LISTENER_SITES);

  console.log('');
  // M9: pretend R01's rAF cancel was reverted.
  manifestFloor('M9.demo', 'cancelAnimationFrame sites (INJECTED DELTA)',
    [], CANCEL_RAF_SITES);

  console.log('\nDemo complete. The three blocks above are deliberate failures.');
  console.log('Note what each one NAMES — a path, a source line — not merely a number.');
  process.exit(0);
}

console.log(`\n${pass + fail} assertions — ${pass} PASS, ${fail} FAIL`);
if (advisories.length) {
  console.log('\nAdvisories (not failures — a monotonic pin has slack and should be re-tightened):');
  for (const a of advisories) console.log('  ' + a);
}
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
