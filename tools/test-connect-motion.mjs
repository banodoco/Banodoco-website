// Deterministic, renderer-free regressions for the two camera-side causes of
// Connect's perceived stall-then-roll. Run with: node tools/test-connect-motion.mjs
import assert from 'node:assert/strict';
import { CONNECT_APPROACH_RAMP } from '../journey/constants.js';
import { trapEase } from '../journey/lib/ease.js';
import { applyPortrait, portraitWeight } from '../journey/portrait.js';
import { restProgress, startOf } from '../journey/route.js';

const inspireP = restProgress('inspire');
const connectP = restProgress('connect');
// The mid-travel portrait key rides the leg INTO Connect at 0.652 of it, and
// since 2026-08-30 that leg departs the Equip rest rather than the Inspire one
// (journey/portrait.js carries the re-anchor and why). Re-derived here from the
// same two ends the field uses, so the sample lands on the key rather than
// 0.04 of p short of it.
const equipP = restProgress('equip');
const midP = equipP + 0.652 * (connectP - equipP);

// The Connect camera must retain its plateau velocity through the visible
// ground-light intro, then make one short exact landing at the rest.
const derivative = (u, h = 1e-5) => (trapEase(u + h, CONNECT_APPROACH_RAMP)
  - trapEase(u - h, CONNECT_APPROACH_RAMP)) / (2 * h);
const plateauRate = 1 / (1 - CONNECT_APPROACH_RAMP);
const beforeFinaleU = (0.49 - inspireP) / (connectP - inspireP);
assert.ok(derivative(beforeFinaleU) >= plateauRate * 0.99,
  'Connect camera must not begin its landing crawl before the finale');
assert.equal(trapEase(0, CONNECT_APPROACH_RAMP), 0);
assert.equal(trapEase(1, CONNECT_APPROACH_RAMP), 1);

const portraitPose = (p) => {
  const pose = {
    pos: { x: 0, y: 0, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    fov: 40,
  };
  return applyPortrait(pose, p, 0.75, 430);
};
const mid = portraitPose(midP);
const rest = portraitPose(connectP);

// D23's +0.80 vertical taste adjustment and the phone-only Connect framing
// belong to the whole movement, not only its final zero-slope segment. Keep
// the approved eye exact and carry the gaze adjustment by the interior key so
// neither can re-accelerate during the visible landing.
//
// RE-BASELINED 2026-08-24 (PHONE-01), eye 2.30 -> 2.75. The phone-only Connect
// offset still contributes the same authored 0.45, but it is now delivered as
// an equal eye+target truck instead of a target-only pitch — because a pitch
// is exactly what portrait.js's own Connect-rest comment forbids on this leg
// ("Connect's reveal is derived from forward.y"). Under the old delivery this
// pin read 2.30 / 2.75 and PASSED while the property the pitch actually
// governs was broken: the camera-pure resolve at the Connect rest had fallen
// to 0.9267 on a 430x932 phone (1.0000 ablated), non-monotone across the leg,
// with the chips frozen mid-formation at the rest. This pin could not see any
// of that, because it records WHERE the camera ended up, not WHAT the camera
// is for. Evidence + the four-way measurement:
// docs/code-health/evidence/2026-08-21-elegance-run-01/phone-01/
//
// The two numbers below are now EQUAL, and that is the point, not a
// coincidence: the harness pose's base forward is level (fwd.y = 0) and the
// Connect rest key carries rise == tgtUp == 2.30, so eye.y == target.y at
// this rest is precisely the statement "the phone offset left forward.y
// alone". A future target-only phone offset reds this pin on the eye value.
//
// SUBORDINATE SINCE REST-01 (2026-08-24). These two lines are kept because a
// coordinate that has been consciously approved is worth holding still, but
// they are NO LONGER THE GOVERNING ASSERTION on this leg. Section REST-01
// below states the property they were proxying and asserts it directly, per
// composition and on the real `poseAt`; the numbers here are one synthetic
// pose's worth of the same idea and were re-blessed once already. If the two
// ever disagree, REST-01 is the one that decides.
assert.ok(Math.abs(rest.pos.y - 2.75) < 1e-9);
assert.ok(Math.abs(rest.target.y - 2.75) < 1e-9);
assert.ok(rest.pos.y - mid.pos.y <= 1.25,
  'portrait eye must not restart a large truck during the Connect intro');
assert.ok(rest.target.y - mid.target.y <= 1.25,
  'portrait gaze must not restart a large truck during the Connect intro');

/* ====================================================================
 * REST-01 — THE PROPERTY, NOT THE COORDINATE.
 *
 * WHAT THIS SECTION IS FOR. Connect's reveal is one camera-pure scalar,
 * `sm(GAZE_HI, GAZE_LO, forward.y)` (journey/chapters/connect/index.js). The
 * whole chapter — path light, hub ignition, the chips' gate floor — rides it.
 * The contract is therefore about the GAZE, and it has two halves:
 *
 *   R1  the resolve is exactly 1 at the Connect rest, and
 *   R2  it gets there monotonically, arriving BEFORE the rest, not at it.
 *
 * 1fa145f moved the phone's Connect target alone. That is a pitch, which
 * portrait.js's own Connect-rest key forbids on this leg, and it took R1 to
 * 0.9267 and broke R2 — while the coordinate pin above, updated in the same
 * commit, went green for three days. A pin whose baseline must be re-blessed
 * whenever upstream moves is recording, not asserting; this section is the
 * conversion.
 *
 * PER COMPOSITION, NOT ONCE — the design point. The defect existed only where
 * `viewportWidth <= 620 && aspect < 1`. It was invisible at 1440x900, at every
 * tablet, and at the aspect the pin above uses. A single-composition assertion
 * would have missed it exactly as the coordinate did, so the table below walks
 * the whole branch space portrait.js distinguishes (portrait weight zero /
 * fading / full, tablet band zero / partial / full, phone width branch on /
 * off) and COV asserts that it does.
 *
 * NOTHING HERE IS A RESTATED LITERAL. GAZE_HI/GAZE_LO are sliced out of the
 * shipped chapter, the width breakpoint and the tablet band edges out of
 * shipped portrait.js, the rests out of route.js, the ease out of lib/ease.js.
 * Upstream moving any of them moves this check with it — which is the whole
 * difference between this section and the pin above.
 *
 * THE MUTANT RUNS ON EVERY RUN, WITH NO FLAG. `--prove-failure` was not used:
 * the chain invokes this suite unflagged (tools/test-gate-composition.mjs's
 * CM7 mutant depends on that), and the cleanup plan's own finding is that
 * eleven suites carry proof modes the chain never runs. An unconditional
 * mutant cannot become the twelfth.
 * ==================================================================== */
import { readFileSync, readdirSync } from 'node:fs';
import { smooth01 } from '../journey/lib/ease.js';
import { installVendorResolver } from './render-report-lib.mjs';
import { stripComments } from './strip-comments.mjs';

installVendorResolver();
const { poseAt } = await import('../journey/director.js');
const THREE = await import('../vendor/three/three.module.js');

const src = (p) => stripComments(readFileSync(new URL(p, import.meta.url), 'utf8'));
/** The one `const <name> = <number>` in `text`. A miss or an ambiguity is a
 *  fault, not a fallback: a slice that could mean two things is not an anchor. */
const constant = (text, name) => {
  const hits = [...text.matchAll(new RegExp(`\\bconst ${name} = (-?[0-9.]+)`, 'g'))];
  assert.equal(hits.length, 1, `REST-01: anchor for ${name} must hit exactly once`);
  return Number(hits[0][1]);
};

const CONNECT = src('../journey/chapters/connect/index.js');
const PORTRAIT = src('../journey/portrait.js');
const GAZE_HI = constant(CONNECT, 'GAZE_HI');
const GAZE_LO = constant(CONNECT, 'GAZE_LO');
// The law is the chapter's, executed shape and all — if the reveal stops being
// this smoothstep on forward.y, the slice below reds rather than drifting.
assert.ok(CONNECT.includes('sm(GAZE_HI, GAZE_LO, _fwd.y)'),
  'REST-01/LAW: Connect no longer derives its reveal from sm(GAZE_HI, GAZE_LO, forward.y)');

/* THE ENUMERATION, DERIVED. The order asks which rests carry a camera-pure
   reveal of THIS kind. Owned's and Final's reveals are camera-pure too, but
   they read the camera's POSITION (soil depth, lens x), not its look axis, so
   the gaze law does not govern them and asserting it at their rests would be
   false. The look-axis readers are found rather than listed: the day a second
   chapter reads getWorldDirection, this reds and asks for its rest. */
const chapterFiles = readdirSync(new URL('../journey/chapters/', import.meta.url),
  { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith('.js'))
  .map((d) => `${d.parentPath.split('/chapters/')[1] ?? ''}/${d.name}`.replace(/^\//, ''));
const gazeReaders = chapterFiles
  .filter((f) => src(`../journey/chapters/${f}`).includes('getWorldDirection'))
  .sort();
assert.ok(chapterFiles.length > 40, 'REST-01/ENUM: the chapter scan found almost nothing — it went blind');
assert.deepEqual(gazeReaders, ['connect/index.js'],
  'REST-01/ENUM: the set of chapters whose reveal reads the camera look axis has changed');

/* THE COMPOSITIONS. Every branch (aspect, viewportWidth) selects in
   portrait.js, plus the two negative controls. `ablation` is the phone frame
   with the width branch switched off — it is what the phone must agree with. */
const WIDTH_BREAK = Number(PORTRAIT.match(/viewportWidth <= (\d+)/)[1]);
const TAB_FULL = constant(PORTRAIT, 'TABLET_FULL_ASPECT');
const TAB_ZERO = constant(PORTRAIT, 'TABLET_ZERO_ASPECT');
const COMPOSITIONS = [
  ['desktop 1440x900', 1440 / 900, 1440],
  ['deskNarrow 1280x1024', 1280 / 1024, 1280],
  ['compact 900x540', 900 / 540, 900],
  ['portrait-fade 700x800', 700 / 800, 700],
  ['tablet 768x1024', 768 / 1024, 768],
  ['tablet-band edge 620x1000', 620 / 1000, 620],
  ['phone-wide 600x700', 600 / 700, 600],
  ['phone 430x932', 430 / 932, 430],
  ['phone 375x812', 375 / 812, 375],
  ['phone 320x568', 320 / 568, 320],
  ['ablation 430x932 @621w', 430 / 932, 621],
];

// COV — the table must actually reach every branch, on every axis portrait.js
// selects on. This is the assertion that stops a future edit from quietly
// shrinking the sweep back to the one composition that could not see the fault.
const tri = (x) => (x <= 0 ? 'off' : x >= 1 ? 'full' : 'part');
const axis = (label, seen) => {
  for (const need of ['off', 'part', 'full']) {
    assert.ok(seen.has(need), `REST-01/COV: no composition leaves ${label} ${need}`);
  }
};
axis('the portrait field', new Set(COMPOSITIONS.map(([, a]) => tri(portraitWeight(a)))));
// The tablet delta rides portraitWeight, so its landscape value is not a state.
axis('the tablet band', new Set(COMPOSITIONS.map(([, a]) => (portraitWeight(a) <= 0 ? 'off'
  : tri((a - TAB_ZERO) / (TAB_FULL - TAB_ZERO))))));
const phones = COMPOSITIONS.filter(([, a, w]) => w <= WIDTH_BREAK && a < 1);
assert.ok(phones.length > 0 && phones.length < COMPOSITIONS.length,
  'REST-01/COV: the phone width branch must be exercised on BOTH sides — it is the branch the defect lived in');

const _v = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };
const poseOf = (p, aspect, width) => {
  poseAt(p, _v, undefined, aspect, width);
  return { ex: _v.pos.x, ey: _v.pos.y, ez: _v.pos.z, tx: _v.target.x, ty: _v.target.y, tz: _v.target.z, fov: _v.fov };
};
const resolveOf = (q) => {
  const fy = q.ty - q.ey;
  return smooth01(((fy / Math.hypot(q.tx - q.ex, fy, q.tz - q.ez)) - GAZE_HI) / (GAZE_LO - GAZE_HI));
};
/** R1 + R2 over one composition, as data. `bend` is the largest backward step
 *  in the resolve across the approach leg; `firstFull` is where it reaches 1. */
const walkLeg = (aspect, width, poseFn = poseOf) => {
  let prev = -1, bend = 0, firstFull = null;
  for (let i = 0; ; i++) {
    const p = Math.min(inspireP + i * 5e-4, connectP);
    const r = resolveOf(poseFn(p, aspect, width));
    if (prev >= 0) bend = Math.max(bend, prev - r);
    if (firstFull === null && r >= 1) firstFull = p;
    prev = r;
    if (p >= connectP) break;
  }
  return { rest: prev, bend, firstFull };
};

const measured = COMPOSITIONS.map(([name, a, w]) => [name, a, w, walkLeg(a, w)]);
for (const [name, , , m] of measured) {
  assert.equal(m.rest, 1, `REST-01/R1: ${name} — Connect's camera-pure resolve at its own rest`);
  assert.equal(m.bend, 0, `REST-01/R2: ${name} — the resolve went BACKWARDS on the approach leg`);
  assert.ok(m.firstFull !== null && m.firstFull < connectP,
    `REST-01/R2: ${name} — the resolve must be full before the rest, not at it`);
}

/* R3 — WHY R1 HOLDS, stated as mechanism. The phone-only Connect offset must
   be a pure vertical TRUCK: eye and target by the same amount, everything else
   bit-identical to the ablation. A truck leaves forward.y exact, so the phone
   inherits the ablation's reveal thresholds; a pitch does not. This is what
   the 2.75/2.75 pin above was reaching for, said about the shipped pose. */
const ABLATED_W = WIDTH_BREAK + 1;   // the same frame, one pixel past the branch
const truck = COMPOSITIONS.filter(([, , w]) => w <= WIDTH_BREAK).map(([name, a, w]) => {
  const ph = poseOf(connectP, a, w), ab = poseOf(connectP, a, ABLATED_W);
  assert.deepEqual([ph.ex, ph.ez, ph.tx, ph.tz, ph.fov], [ab.ex, ab.ez, ab.tx, ab.tz, ab.fov],
    `REST-01/R3: ${name} — the phone Connect offset moved something other than the frame's height`);
  assert.equal(ph.ey - ab.ey, ph.ty - ab.ty,
    `REST-01/R3: ${name} — eye and target did not move together, so this is a pitch, not a truck`);
  return ph.ey - ab.ey;
});
assert.ok(truck.some((d) => d > 0), 'REST-01/R3: no phone composition receives any Connect lift at all');

/* R4 — THE MUTANT, ON EVERY RUN. Rebuild 1fa145f's target-only delivery from
   the shipped pose: R3 has just proved the phone/ablation difference IS the
   lift and nothing else, so dropping it from the eye alone reproduces the
   pre-fix camera exactly (0.926724 at 430x932 — the recorded 0.9267, and a
   gaze of -6.200 deg against the recorded -6.20).
   Which compositions the mutant can move is DERIVED, not declared: the width
   ramp bottoms out at 320, so 320x568 receives no lift and the mutant is a
   no-op there. Everything it moves must red; everything it does not must stay
   green — and the green half IS the counterfactual, asserted by name below. */
const mutantPose = (p, aspect, width) => {
  const q = poseOf(p, aspect, width);
  return { ...q, ey: q.ey - (q.ey - poseOf(p, aspect, ABLATED_W).ey) };
};
const moved = [], unmoved = [];
for (const [name, a, w] of COMPOSITIONS) {
  const m = walkLeg(a, w, mutantPose);
  if (poseOf(connectP, a, w).ey === poseOf(connectP, a, ABLATED_W).ey) {
    assert.equal(m.rest, 1, `REST-01/R4: ${name} carries no phone lift, so the mutant must not move it`);
    unmoved.push(name);
  } else {
    assert.ok(m.rest < 1 && m.bend > 0,
      `REST-01/R4: ${name} — the target-only defect is restored and this check did not see it`);
    moved.push(name);
  }
}
assert.ok(moved.length > 0,
  'REST-01/R4: the restored defect moved no composition at all — the mutant has gone vacuous');
assert.ok(unmoved.includes(COMPOSITIONS[0][0]),
  `REST-01/R4: ${COMPOSITIONS[0][0]} must stay green under the restored defect — a check written only `
  + 'there is exactly the check that went green for three days, and is why this one is not written only there');

console.log(`Connect camera motion: PASS (REST-01: ${measured.length} compositions; the restored `
  + `target-only defect reds ${moved.length} of them — ${moved.join(', ')} — and is invisible at the other `
  + `${unmoved.length})`);

/* ====================================================================
 * REST-02 — THE SAME LAW, AT THE RESTS THE CAMERA'S *POSITION* GOVERNS.
 *
 * WHY THIS EXISTS. REST-01 above proved that Connect is the only chapter
 * whose reveal reads the camera's LOOK AXIS, and asserted the gaze law only
 * there — correctly, because asserting a gaze law at a rest that does not
 * have one would be false. That left its own gap, named in its order: three
 * chapters derive their reveal from the camera's POSITION, and whether each
 * one lands FULL at its own rest — per composition — was unasserted. The
 * capture set cannot see it either: a reveal that stops at 0.95 of full is a
 * slightly dimmer frame, which is exactly the difference no golden on this
 * machine can distinguish from a GPU.
 *
 * It is the same defect class as the 0.9267, one axis over. 1fa145f moved a
 * phone's target and took a look-axis reveal off 1 at its own rest; nothing
 * stops a portrait key from lifting an eye 0.05 units and taking a
 * POSITION-axis reveal off 1 at its own rest. The measurement below says that
 * is precisely how much room Owned has on a phone.
 *
 * THE THREE LAWS ARE SLICED, NOT RESTATED. Final's is IMPORTED outright
 * (pullOf / PULL_MAX are exported by the chapter's own module). Owned's and
 * Inspire's live inside their factory closures and cannot be imported, so
 * their constants are cut out of the shipped source with the same anchored
 * regex REST-01 uses for GAZE_HI/GAZE_LO, and the executed SHAPE of each law
 * is pinned by asserting the shipped statement text. Upstream moving a
 * number moves this check with it; upstream moving the LAW reds it and asks
 * for a re-read. Nothing here is a literal a future edit could satisfy by
 * re-blessing.
 *
 * THE MUTANTS RUN ON EVERY RUN, WITH NO FLAG — same reason as REST-01/R4.
 * Each chapter's break threshold is BISECTED from the shipped pose rather
 * than declared, and the mutant is then fired at the midpoint of the table's
 * own range, so it must red some compositions and leave others green. That
 * split is the whole argument for sweeping compositions instead of picking
 * one: at OWNED the thinnest margin is a PHONE's and desktop is comfortable;
 * at FINAL it is exactly inverted — landscape sits ON the ceiling with zero
 * headroom and the phones have room to spare. A suite written at either
 * single composition would be blind to the other chapter's fault.
 * ==================================================================== */

const { pullOf, pullRawOf, PULL_MAX } = await import('../journey/chapters/final/world.js');
const { groundY } = await import('../journey/anatomy.js');

/** REST-01's `constant` requires its own `const`; these constants are cut from
 *  multi-declarator statements inside a factory closure, so anchor on the name
 *  alone — still exactly once, still a fault if it is ambiguous. */
const localNum = (text, name) => {
  const hits = [...text.matchAll(new RegExp(`\\b${name} = (-?[0-9.]+)`, 'g'))];
  assert.equal(hits.length, 1, `REST-02: anchor for ${name} must hit exactly once`);
  return Number(hits[0][1]);
};
const lawIs = (text, tag, ...lines) => {
  for (const l of lines) assert.ok(text.includes(l), `REST-02/LAW: ${tag} is no longer «${l}»`);
};

const OWNED = src('../journey/chapters/owned/index.js');
const CONNECT_LAWS = CONNECT;   // REST-01 already sliced it; name it for the reader
void CONNECT_LAWS;
const OWNED_LEG = src('../journey/chapters/owned/leg.js');
const INSPIRE = src('../journey/chapters/inspire/index.js');
const FINAL = src('../journey/chapters/final/index.js');

/* THE ENUMERATION, DERIVED — REST-01/ENUM's other half. That one found the
   single look-axis reader; this finds the position readers. A fourth chapter
   reading the camera's position reds here and owes this file its rest law. */
const posReaders = chapterFiles
  .filter((f) => src(`../journey/chapters/${f}`).includes('sceneApi.camera.position'))
  .sort();
assert.deepEqual(posReaders, ['connect/index.js', 'final/index.js', 'inspire/index.js', 'owned/index.js'],
  'REST-02/ENUM: the set of chapters whose reveal reads the camera POSITION has changed');

/* --- OWNED: arrival = max(sink, keep), off the lens's depth under the soil.
   `keepGate` is the blend latch and is 1 in every settled frame (the shipped
   line below is what settles it), so a rest is evaluated with it at 1. */
lawIs(OWNED, "Owned's arrival",
  'const cp = sceneApi.camera.position;',
  'const depth = leg.groundY(cp.x, cp.z) - cp.y;',
  'const sink = smooth01(depth / SINK_D);',
  'const xHalf = smooth01((-cp.x - KEEP_X0) / KEEP_XW);',
  'const keep = xHalf * smooth01((cp.z - KEEP_Z0) / KEEP_ZW) * keepGate;',
  'const arrival = Math.max(sink, keep);',
  'if (keepGate > 0.996) keepGate = 1;');
lawIs(OWNED_LEG, "Owned's ground sampler",
  "import { groundY, stemAxis } from '../../anatomy.js';", 'exitP, exitPt, groundY,');
const SINK_D = localNum(OWNED, 'SINK_D');
const KEEP_X0 = localNum(OWNED, 'KEEP_X0'), KEEP_XW = localNum(OWNED, 'KEEP_XW');
const KEEP_Z0 = localNum(OWNED, 'KEEP_Z0'), KEEP_ZW = localNum(OWNED, 'KEEP_ZW');
const ownedArrival = (q) => Math.max(
  smooth01((groundY(q.ex, q.ez) - q.ey) / SINK_D),
  smooth01((-q.ex - KEEP_X0) / KEEP_XW) * smooth01((q.ez - KEEP_Z0) / KEEP_ZW));

/* --- INSPIRE: three exit currents arrive on the camera's AZIMUTH. Full means
   all three, so the law's value is the weakest of them. */
lawIs(INSPIRE, "Inspire's arrival",
  'const c = sceneApi.camera.position;',
  'let d = Math.atan2(c.x, c.z) * RAD2DEG;',
  'if (d < -90) d += 360;',
  'eff[i] = exits[i].fade * arrOf(azDeg, ARR[i]);');
const ARR = [...INSPIRE.matchAll(/\{ a0: (-?[\d.]+),\s+a1: (-?[\d.]+) \}/g)].map((m) => [+m[1], +m[2]]);
assert.equal(ARR.length, 3, "REST-02: Inspire's arrival ramp table is no longer three exits");
const inspireArrival = (q) => {
  let d = Math.atan2(q.ex, q.ez) * 180 / Math.PI;
  if (d < -90) d += 360;
  return Math.min(...ARR.map(([a0, a1]) => smooth01((d - a0) / (a1 - a0))));
};

/* --- CONNECT, its OTHER driver. The chapter reads the camera twice: the gaze
   REST-01 governs, and this — the exit convergence as the lens walks in to the
   trunk on the Connect->Owned join. It is a DEPARTURE term, so its value at
   Connect's own rest is exactly ZERO, not one, and asserting 1 here would be
   the same falsehood as asserting a gaze law at Owned. Zero is the property
   worth holding: a portrait key that pulled the rest eye inward would have the
   exit glow already burning in the frame the visitor stops on. */
lawIs(CONNECT, "Connect's exit convergence",
  'const cam = sceneApi.camera.position;',
  'const camRad = Math.hypot(cam.x, cam.z);',
  'U.uExit.value = sm(5.0, 2.4, camRad) * visualAmount;');
const EXIT_R = [...CONNECT.matchAll(/sm\((-?[\d.]+), (-?[\d.]+), camRad\)/g)];
assert.equal(EXIT_R.length, 1, "REST-02: anchor for Connect's exit radii must hit exactly once");
const [, EXIT_HI, EXIT_LO] = EXIT_R[0].map(Number);
const connectExit = (q) => smooth01((Math.hypot(q.ex, q.ez) - EXIT_HI) / (EXIT_LO - EXIT_HI));

/* --- FINAL: pull off the camera's x, imported from the chapter outright. */
lawIs(FINAL, "Final's reveal driver", 'pullOf(sceneApi.camera.position.x)');
const finalPull = (q) => pullOf(q.ex) / PULL_MAX;

/* THE PERTURBATION each law is sensitive to: one move, along the axis that
   law actually reads. This is what the mutants below travel on. */
const LAWS = [
  ['inspire arrival', restProgress('inspire'), inspireArrival, 1, 'eye azimuth -deg',
    (q, d) => { const a = Math.atan2(q.ex, q.ez) - d * Math.PI / 180, r = Math.hypot(q.ex, q.ez);
      return { ...q, ex: r * Math.sin(a), ez: r * Math.cos(a) }; }],
  ['connect exit', connectP, connectExit, 0, 'eye radius -u',
    (q, d) => { const r = Math.hypot(q.ex, q.ez), k = (r - d) / r; return { ...q, ex: q.ex * k, ez: q.ez * k }; }],
  ['owned arrival', restProgress('owned'), ownedArrival, 1, 'eye +y',
    (q, d) => ({ ...q, ey: q.ey + d })],
  ['final pull', restProgress('final'), finalPull, 1, 'eye +x',
    (q, d) => ({ ...q, ex: q.ex + d })],
];

/* R5 — THE PROPERTY. Every position-pure driver sits exactly on its authored
   rest value — full for the three arrivals, zero for the one departure — on
   every composition in REST-01's table. */
const calib = [];
for (const [chapter, restP, law, want, axis, move] of LAWS) {
  const breaks = COMPOSITIONS.map(([name, a, w]) => {
    const q = poseOf(restP, a, w);
    assert.equal(law(q), want,
      `REST-02/R5: ${chapter} @ ${name} — the chapter's camera-pure driver is off its rest value`);
    // R6 — HOW MUCH ROOM, bisected from the shipped pose. Never declared, so
    // it cannot rot; it is also the number that says which composition is the
    // thin one, which is the answer a single-composition check cannot give.
    let lo = 0, hi = 1e-6;
    while (law(move(q, hi)) === want && hi < 1024) hi *= 2;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (law(move(q, m)) === want) lo = m; else hi = m; }
    return [name, hi];
  });
  const hi = breaks.reduce((b, r) => (r[1] > b[1] ? r : b));
  const lo = breaks.reduce((b, r) => (r[1] < b[1] ? r : b));
  assert.ok(hi[1] > 0 && hi[1] < 1024,
    `REST-02/R6: ${chapter} — no composition's reveal could be broken by any ${axis} at all; the law has gone vacuous`);
  // R7 — THE MUTANT, ON EVERY RUN. Fired at the midpoint of the table's own
  // measured range, so by construction it MUST split: the thin composition
  // reds, the roomy one does not. Both halves are asserted, because the green
  // half is the counterfactual that stops this becoming a check that passes
  // everywhere for the wrong reason.
  const d = (lo[1] + hi[1]) / 2;
  const moved = [], stayed = [];
  for (const [name, a, w] of COMPOSITIONS) {
    (law(move(poseOf(restP, a, w), d)) === want ? stayed : moved).push(name);
  }
  assert.ok(moved.length > 0,
    `REST-02/R7: ${chapter} — a ${axis} of ${d} broke nothing; the mutant is vacuous`);
  assert.ok(stayed.length > 0,
    `REST-02/R7: ${chapter} — a ${axis} of ${d} broke EVERY composition, so this run proves nothing `
    + 'about the sweep; the thin composition and the roomy one must be told apart');
  assert.ok(moved.includes(lo[0]) && stayed.includes(hi[0]),
    `REST-02/R7: ${chapter} — the mutant did not red the measured-thinnest composition (${lo[0]}) `
    + `while sparing the roomiest (${hi[0]})`);
  calib.push(`${chapter}: thinnest ${lo[0]} at ${axis} ${lo[1].toFixed(4)}, roomiest ${hi[0]} at ${hi[1].toFixed(4)}`);
}

/* R8 — FINAL'S CEILING IS A PROPERTY, NOT A NORMALISATION. world.js says the
   clamp is "the value the camera-pure driver actually reaches at the rest",
   which makes it an EQUALITY between two independently-derived quantities —
   the shipped ceiling and the shipped landscape pose — rather than a number
   anyone may re-bless. R5 above cannot see this: pullOf is clamped, so a
   wrong ceiling still reads "full". Restoring the retired arbitrary 1.0
   is the mutant, and it reds here and nowhere else. */
const landscapeRestX = poseOf(restProgress('final'), ...COMPOSITIONS[0].slice(1)).ex;
assert.equal(pullRawOf(landscapeRestX), PULL_MAX,
  "REST-02/R8: Final's pull ceiling is no longer the value the landscape rest pose reaches");
for (const [name, a, w] of COMPOSITIONS) {
  assert.ok(pullRawOf(poseOf(restProgress('final'), a, w).ex) >= PULL_MAX,
    `REST-02/R8: ${name} — the Final rest falls short of the ceiling the landscape rest defines`);
}
assert.notEqual(pullRawOf(landscapeRestX), 1.0,
  'REST-02/R8: the restored arbitrary ceiling of 1.0 is indistinguishable from the shipped one here, '
  + 'so R8 could not have seen the light-ceiling defect it exists for');

/* R9 — THE PHONE'S FINAL OFFSET IS A PURE VERTICAL TRUCK. portrait.js claims
   it moves eye and target together and leaves "pitch, scale, diagonal and any
   camera-pure reveal driver" exact. Final's driver reads x, so the claim is
   checkable: against the 621-wide ablation, only y may differ, and eye and
   target must differ by the same amount. This is the check with teeth for a
   phone-only axis fault — R5 has 0.77 units of x to spare on a phone and
   would not notice one; this notices at 1e-12. */
const finalPhones = COMPOSITIONS.filter(([, a, w]) => w <= WIDTH_BREAK && a < 1);
let liftSeen = 0;
for (const sample of [restProgress('final'), startOf('final'), 0.90, 0.95]) {
  for (const [name, a, w] of finalPhones) {
    const ph = poseOf(sample, a, w), ab = poseOf(sample, a, ABLATED_W);
    assert.deepEqual([ph.ex, ph.ez, ph.tx, ph.tz, ph.fov], [ab.ex, ab.ez, ab.tx, ab.tz, ab.fov],
      `REST-02/R9: ${name} @ p${sample} — the phone Final offset moved an axis other than the frame's height`);
    // Eye and target reach their y through different addend orders inside
    // applyPortrait, so the two deltas agree to ULPs rather than to bits
    // (measured: 4.4e-16 apart at 620x1000, p 0.97). The tolerance is ULP-
    // scale ON PURPOSE and is not a fudge: the fault this catches — the
    // 1fa145f delivery, transplanted — makes ONE of the two deltas zero while
    // the other is the whole authored offset, which is fifteen orders of
    // magnitude outside it. R9's own mutant below fires exactly there.
    const dEye = ph.ey - ab.ey, dTgt = ph.ty - ab.ty;
    assert.ok(Math.abs(dEye - dTgt) <= 8 * Number.EPSILON * Math.max(1, Math.abs(dEye)),
      `REST-02/R9: ${name} @ p${sample} — eye and target did not move together, so this is a pitch, `
      + `not a truck (eye ${dEye}, target ${dTgt})`);
    liftSeen = Math.max(liftSeen, Math.abs(dEye));
  }
}
assert.ok(liftSeen > 0, 'REST-02/R9: no phone composition receives any Final offset at all — R9 is vacuous');

console.log(`Connect camera motion: PASS (REST-02: ${LAWS.length} position-pure rests x ${COMPOSITIONS.length} `
  + `compositions; ${calib.join('; ')}; Final's phone truck holds to ${liftSeen.toFixed(3)}u at 4 leg samples)`);
