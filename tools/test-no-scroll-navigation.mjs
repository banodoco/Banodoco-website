#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { azTurn } from '../journey/camera-path.js';
import * as navigationModule from '../journey/navigation.js';
import {
  DEFAULT_NAVIGATION_SPEED,
  NAVIGATION_DIRECTION_SPEED,
  NAVIGATION_SPEED,
  navigationDurationSeconds,
  navigationSpeed,
} from '../journey/navigation-timing.js';
import { createTransport } from '../journey/transport.js';
import { createCopyArrival } from '../journey/ui/copy-arrival.js';
import { createTransitionController } from '../journey/transition/controller.js';
import { createHeroGroundDimClaim } from '../journey/chapters/hero-ground-dim.js';
import { railWrapNavigationProgress } from '../journey/ui/rail-handoff.js';

const { controlWrapDirection, navSense, TURN_FORWARD } = navigationModule;
const ids = ['mission', 'inspire', 'connect', 'owned', 'final'];
const wrappedPairs = new Map([
  ['mission>final', -1],
  ['final>mission', 1],
]);
for (const fromId of ids) {
  for (const targetId of ids) {
    const pair = `${fromId}>${targetId}`;
    assert.equal(controlWrapDirection(fromId, targetId), wrappedPairs.get(pair) || 0,
      `${pair} must ${wrappedPairs.has(pair) ? 'take the authored wrap orbit' : 'remain a direct jump'}`);
  }
}

// Pin the visual meaning of the seam against the authored rest azimuths, not
// merely the routing table. THE SEAM ALWAYS TURNS FORWARD (2026-09-01, the
// owner's unified turn grammar): both bookend wraps orbit in TURN_FORWARD's
// sense — the up-wrap earns the long ceremonial lap because its short way is
// backward, and the loop home takes the short way in that same forward sense.
// [Pin moved 2026-09-01: the retired assertion held |sweep| > pi for BOTH
// crossings via the wrap sign (`-wrap`), the 2026-08-12 continue-the-ride
// law; the owner's grammar makes the loop home short and forward, so the
// old pin's subject no longer exists. What it protected — that the seam's
// sense is authored, never the generic shortest way — is what the two
// direction-specific assertions below now hold.]
const restAzimuth = { mission: -13.8, inspire: 115.0, final: -79.6 };
const atAzimuth = degrees => {
  const a = degrees * Math.PI / 180;
  return { x: Math.sin(a), y: 0, z: Math.cos(a) };
};
{
  const upSweep = azTurn(atAzimuth(restAzimuth.mission), atAzimuth(restAzimuth.final), TURN_FORWARD);
  assert.ok(upSweep > Math.PI,
    `mission>final must orbit the long way in the forward sense (got ${(upSweep * 180 / Math.PI).toFixed(1)}deg)`);
  const homeSweep = azTurn(atAzimuth(restAzimuth.final), atAzimuth(restAzimuth.mission), TURN_FORWARD);
  assert.ok(homeSweep > 0 && homeSweep < Math.PI,
    `final>mission must take the short way home in the forward sense (got ${(homeSweep * 180 / Math.PI).toFixed(1)}deg)`);
}

// THE UNIFIED TURN GRAMMAR is one comparator over nav order; nothing else in
// the chain pins the sense any ordinary jump is forced into, and a silently
// reversed comparator would turn every camera transition against its
// direction of travel while every duration and shaping suite stayed green.
// Bought (2026-09-01): the sense table itself — forward pairs +1, backward
// pairs -1, for all ordered chapter pairs — at zero new files.
{
  const order = ['mission', 'inspire', 'equip', 'connect', 'owned', 'final'];
  assert.equal(TURN_FORWARD, 1,
    'TURN_FORWARD is the measured azimuth sign of the owner-approved forward legs');
  for (const fromId of order) {
    for (const targetId of order) {
      if (fromId === targetId) continue;
      const expected = order.indexOf(targetId) > order.indexOf(fromId)
        ? TURN_FORWARD : -TURN_FORWARD;
      assert.equal(navSense(fromId, targetId), expected,
        `${fromId}>${targetId} must be forced into the sense of its nav travel`);
    }
  }
}

// ...and journey.js must actually spend the law: the wrap through the seam
// clause, every other rest-departing jump through navSense, with the two
// deliberate shortest-way exceptions (an overtaken leg and a same-chapter
// settle) intact.
{
  const src = readFileSync(new URL('../journey/journey.js', import.meta.url), 'utf8');
  assert.match(src, /azTurn\(pos0, cam\.position, WRAP_TURN \|\| TURN_FORWARD\)/,
    'the seam must turn forward both ways unless QA forces a sense');
  assert.match(src, /: routeFaithful \|\| overtaken \|\| fromChapterId === chapterId \? null\n\s*: azTurn\(pos0, cam\.position, navSense\(fromChapterId, chapterId\)\)/,
    'every ordinary rest-departing jump takes the grammar sense; overtakes and same-chapter settles keep the shortest way');
}

// A route owns its shared character, while explicitly reviewed one-way
// refinements can adjust one direction without changing the return journey.
// Non-adjacent flights never compound the legs they cross.
for (const [from, to, speed] of [
  ['mission', 'inspire', 0.60],       // Intro <-> Inspire remains symmetric
]) {
  assert.equal(navigationSpeed(from, to), speed, `${from} -> ${to} speed`);
  assert.equal(navigationSpeed(to, from), speed, `${to} -> ${from} reverse speed`);
  assert.equal(navigationDurationSeconds(1.2, from, to), 1.2 / speed,
    `${from} -> ${to} converts speed to duration once`);
  assert.equal(navigationDurationSeconds(1.2, to, from), 1.2 / speed,
    `${to} -> ${from} converts reverse speed to duration once`);
}

for (const [from, to, speed, reverseSpeed] of [
  ['inspire', 'connect', 0.80, 0.72], // Connect -> Inspire is 90% of prior speed
  ['connect', 'final', 0.70, 0.49],   // Purpose -> Connect is 70% of prior speed
  ['owned', 'final', 0.75, 0.45],     // Purpose -> Ownership is 60% of prior speed
]) {
  assert.equal(navigationSpeed(from, to), speed, `${from} -> ${to} retains its speed`);
  assert.equal(navigationSpeed(to, from), reverseSpeed,
    `${to} -> ${from} owns its directional refinement`);
  assert.equal(navigationDurationSeconds(1.2, from, to), 1.2 / speed,
    `${from} -> ${to} retains its duration`);
  assert.equal(navigationDurationSeconds(1.2, to, from), 1.2 / reverseSpeed,
    `${to} -> ${from} converts its refined speed once`);
}

assert.equal(DEFAULT_NAVIGATION_SPEED, 0.75);
for (const [from, to] of [
  ['mission', 'connect'],             // generic non-adjacent direct flight
  ['inspire', 'final'],
  ['mission', 'final'],               // special Intro <-> Purpose wrap orbit
]) {
  assert.equal(navigationSpeed(from, to), 0.75, `${from} -> ${to} fallback speed`);
  assert.equal(navigationSpeed(to, from), 0.75, `${to} -> ${from} reverse fallback speed`);
  assert.ok(Math.abs(navigationDurationSeconds(1.2, from, to) - 1.6) < 1e-12,
    `${from} -> ${to} is one 25% speed reduction, not crossed-leg composition`);
}
const connectPurposeDuration = navigationDurationSeconds(1.2, 'connect', 'final');
assert.equal(connectPurposeDuration, 1.2 / 0.70);
assert.notEqual(connectPurposeDuration,
  1.2 / DEFAULT_NAVIGATION_SPEED / DEFAULT_NAVIGATION_SPEED,
  'Connect -> Purpose must not compound its crossed adjacent fallback factors');
assert.throws(() => navigationDurationSeconds(0, 'mission', 'inspire'), /positive finite/);
assert.throws(() => navigationDurationSeconds(Number.NaN, 'mission', 'inspire'), /positive finite/);
assert.ok(Object.isFrozen(NAVIGATION_SPEED), 'the route policy must be immutable');
assert.ok(Object.isFrozen(NAVIGATION_DIRECTION_SPEED),
  'the directional refinement policy must be immutable');

function rig({ blocked = true } = {}) {
  const handlers = new Map();
  globalThis.window = {
    innerHeight: 900,
    addEventListener(type, fn, options) { handlers.set(type, { fn, options }); },
  };

  const calls = { attempts: [], pushes: [], jumps: [], touchMoves: [], touchEnds: 0 };
  let owner = null;
  const transport = createTransport({
    enabled: () => true,
    blocksTravel: () => blocked,
    attempt: (kind) => { calls.attempts.push(kind); return true; },
    push: (...args) => calls.pushes.push(args),
    jump: (...args) => calls.jumps.push(args),
    beginTouchContact() {},
    moveTouchContact: (y) => calls.touchMoves.push(y),
    endTouchContact() { calls.touchEnds += 1; },
    touchContactLive: () => true,
    ownerOf: () => owner,
    modalLive: () => false,
    targetOwnsKey: () => false,
  });
  transport.attach();

  const fire = (type, event) => handlers.get(type).fn(event);
  return { handlers, calls, fire, setOwner(value) { owner = value; } };
}

const prevented = () => {
  const state = { value: false };
  return [state, () => { state.value = true; }];
};

{
  const r = rig();
  const [wheel, preventWheel] = prevented();
  r.fire('wheel', {
    target: {}, deltaY: 240, deltaMode: 0, cancelable: true,
    preventDefault: preventWheel,
  });
  assert.equal(wheel.value, true, 'wheel attempt must be cancelled');
  assert.deepEqual(r.calls.attempts, ['wheel']);
  assert.equal(r.calls.pushes.length, 0, 'wheel attempt must not reach progress');

  const [key, preventKey] = prevented();
  r.fire('keydown', {
    target: {}, key: 'PageDown', defaultPrevented: false,
    metaKey: false, ctrlKey: false, altKey: false, isComposing: false,
    preventDefault: preventKey,
  });
  assert.equal(key.value, true, 'scroll key must be cancelled');
  assert.deepEqual(r.calls.attempts, ['wheel', 'key']);
  assert.equal(r.calls.jumps.length, 0, 'scroll key must not jump');

  r.fire('touchstart', {
    target: {}, touches: [{ clientY: 700 }],
  });
  const [touch, preventTouch] = prevented();
  r.fire('touchmove', {
    target: {}, touches: [{ clientY: 620 }], cancelable: true,
    preventDefault: preventTouch,
  });
  r.fire('touchend', { target: {}, touches: [] });
  assert.equal(touch.value, true, 'vertical touch attempt must be cancelled');
  assert.deepEqual(r.calls.attempts, ['wheel', 'key', 'touch']);
  assert.equal(r.calls.touchMoves.length, 0, 'touch attempt must not reach progress');
  assert.equal(r.calls.touchEnds, 1, 'blocked touch end still clears contact state');

  r.fire('touchstart', { target: {}, touches: [{ clientY: 700 }] });
  r.fire('touchcancel', { target: {}, touches: [] });
  assert.equal(r.calls.touchEnds, 2, 'touch cancellation clears blocked contact state');

  r.setOwner({ modal: true });
  const [owned, preventOwned] = prevented();
  r.fire('wheel', {
    target: {}, deltaY: 120, deltaMode: 0, cancelable: true,
    preventDefault: preventOwned,
  });
  assert.equal(owned.value, false, 'owned modal content keeps native scrolling');
  assert.deepEqual(r.calls.attempts, ['wheel', 'key', 'touch']);
}

{
  const r = rig({ blocked: false });
  r.fire('wheel', {
    target: {}, deltaY: 120, deltaMode: 0, cancelable: true,
    preventDefault() {},
  });
  assert.equal(r.calls.pushes.length, 1,
    'the pure scroll rig remains available when navigation-only mode is absent');
  assert.deepEqual(r.calls.attempts, []);
}

/* A GESTURE ENDS WHEN ITS OWN FINGER LEAVES, NOT WHEN ANY FINGER DOES.
   touchstart and touchmove already bail on a second finger so a pinch cannot
   leak a delta into the ride; touchend did not, and closed the contact for
   whichever finger happened to lift first. What this buys that nothing above
   buys: every other touchend in this tree's suites is fired with an empty
   `touches` and no `changedTouches` at all, so all of them are blind to the
   two-finger case by construction. This is the only row that names the fingers.
   Reported as a live defect: a normal drag that briefly becomes multi-touch
   stops responding. */
{
  const r = rig({ blocked: false });
  const A = { identifier: 1, clientY: 700 };
  const B = { identifier: 2, clientY: 400 };
  const move = (id, y) => r.fire('touchmove', {
    target: {}, touches: [{ identifier: id, clientY: y }],
    cancelable: true, preventDefault() {},
  });

  r.fire('touchstart', { target: {}, touches: [A] });
  move(1, 660);
  assert.equal(r.calls.touchMoves.length, 1, 'the first finger opens a live scrub');

  r.fire('touchstart', { target: {}, touches: [A, B] });   // a pinch join: ignored
  r.fire('touchend', { target: {}, touches: [A], changedTouches: [B] });
  assert.equal(r.calls.touchEnds, 0,
    "a second finger's lift must not close the tracked finger's contact");

  move(1, 600);
  assert.equal(r.calls.touchMoves.length, 2,
    'the surviving finger keeps scrubbing after the other one lifts');

  r.fire('touchend', { target: {}, touches: [], changedTouches: [A] });
  assert.equal(r.calls.touchEnds, 1, "the tracked finger's own lift closes the contact");

  // ...and the same for an OS/browser cancellation of the tracked contact.
  r.fire('touchstart', { target: {}, touches: [A] });
  r.fire('touchcancel', { target: {}, touches: [], changedTouches: [A] });
  assert.equal(r.calls.touchEnds, 2, 'a cancellation naming the tracked finger still closes it');
}

// A navigation cue answers only a blocked gesture at rest. The flight entry
// retires any cue that began immediately before a click, and the callback
// itself refuses to start another while camera and chapter state disagree.
const journeySource = readFileSync(new URL('../journey/journey.js', import.meta.url), 'utf8');
const navigationImport = journeySource.match(
  /import\s*\{([^}]+)\}\s*from\s*['"]\.\/navigation\.js['"]/,
);
assert.ok(navigationImport, 'journey must retain an explicit navigation.js import contract');
const importedNavigationNames = navigationImport[1]
  .split(',').map(name => name.trim()).filter(Boolean);
for (const name of importedNavigationNames) {
  // functions and declared constants alike (TURN_FORWARD is a number):
  // the contract is that every imported name resolves, not that every
  // export is callable.
  assert.notEqual(navigationModule[name], undefined,
    `production graph import '${name}' must exist on navigation.js`);
}
assert.match(journeySource,
  /transition\.steerWrapTo\(restProgress\(chapterId\)\)/,
  'a bookend control delegates to the live wrap ticket before navigation can replace it');
assert.match(journeySource,
  /const baseDuration = wrap[\s\S]*?const dur = navigationDurationSeconds\(baseDuration, fromChapterId, chapterId\);/,
  'directJumpTo must apply timing after either ordinary or wrap base pricing');
assert.equal(
  (journeySource.match(/navigationDurationSeconds\(baseDuration, fromChapterId, chapterId\)/g) || []).length,
  1,
  'the navigation duration policy must be applied exactly once',
);
assert.match(journeySource,
  /if \(transition\.cameraStateDisagree\) return false;/,
  'scroll cue must be suppressed for the entire camera flight');
assert.match(journeySource,
  /function navigateTo\([\s\S]*?ui\.rail\.stopNavigationCue\(\);[\s\S]*?directJumpTo/,
  'a click must stop a cue before beginning camera navigation');
const railSource = readFileSync(new URL('../journey/rail.js', import.meta.url), 'utf8');
assert.match(railSource,
  /railHandoffState\(\{[\s\S]*?selectedChapterId: nowNext,[\s\S]*?cameraStateDisagree,[\s\S]*?\}\)/,
  'Ownership return CTA must be projected from the selected chapter and landed camera');
/* The menu's scrim is a full-screen SIBLING of the panel, and ownership is
   ancestor containment, so claiming the panel alone leaves the visible backdrop
   unowned and a wheel or drag on it scrubs the journey behind the open dialog.
   These two rows are presence, not behaviour — the behavioural half is the
   browser ring, which is where a live scrim can be pointed at. They are here so
   the claim cannot be deleted silently, and they fail loudly on a miss. */
assert.match(railSource, /claimInput\(scrim[,)]/,
  'the open menu must claim its scrim, or the backdrop scrubs the journey behind it');
assert.match(railSource, /releaseInput\(scrim\)/,
  'closing the menu must hand the scrim back to the journey');
const handoffSource = readFileSync(new URL('../journey/boot/handoff.js', import.meta.url), 'utf8');
const heroCssSource = readFileSync(new URL('../hero.css', import.meta.url), 'utf8');
assert.doesNotMatch(handoffSource + heroCssSource, /intro-depart|intro-restore/,
  'an early nav request must not install a parallel CSS opacity owner');
assert.match(handoffSource,
  /const entry = entryQueue\.take\(\);[\s\S]*?readyState\.activate\(\{ entry \}\)/,
  'a queued early click becomes a normal journey transition at activation');
assert.match(journeySource,
  /ui\.prepareCopyEntry\(chapterId\)[\s\S]*?transition\.beginFlight\([\s\S]*?placeAt\(targetP, \{ snap: false \}\)[\s\S]*?ui\.armCopyEntry\(chapterId, dur\)/,
  'the wrap copy ticket must own both synchronous placement frames before it is priced');
assert.match(journeySource,
  /const wrapTicket = wrap \? \{[\s\S]*?homeP:[\s\S]*?targetP,[\s\S]*?phase: 0/,
  'a wrap ticket records both control endpoints for atomic reversal');

// A dt === 0 rest placement is visibly authoritative but intentionally does
// not update easedPrev. The bookend wrap therefore takes its own preflight
// snapshot: both directions must hold the source on the arm frame, then fade
// it instead of snapping it away.
globalThis.Element ??= class {};
const fakeNode = () => ({
  style: { setProperty() {}, removeProperty() {} },
  classList: { add() {}, remove() {} },
  querySelector() { return null; },
  querySelectorAll() { return []; },
});
const copyBlocks = ['inspire', 'connect', 'owned', 'final'];
const makeCopyArrival = (nodes = Object.fromEntries(copyBlocks.map(id => [id, fakeNode()]))) =>
  createCopyArrival({
    blocks: nodes,
    actionRows: {},
    heroBlock: fakeNode(),
    rail: { setHeroEase() {} },
    reduceMotion: { matches: false },
  });

// Execute the production click authority, camera clock, copy envelope and
// rail projection together. The old source-only pin proved the steering law
// existed but not that the click path retained the live ticket; the shipped
// failure replaced this ticket with a new opposite wrap at phase 0, changing
// --nav-content-u by 1 and dropping the hero copy to zero in one click.
{
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
  const copy = makeCopyArrival();
  copy.step({ chapterId: 'mission', dt: 0, travelP: 0 });
  copy.prepareCopyEntry('final');
  const ticket = { dir: -1, homeP: 0, targetP: 0.97, phase: 0 };
  copy.step({ chapterId: 'final', dt: 0, travelP: 0.97, railWrap: ticket });
  copy.armCopyEntry('final', 4);
  const copyPlay = [];
  const controller = createTransitionController({
    input: { claimNow: () => null },
    sceneApi: {
      camera: {
        position: V(6, 2, 0), fov: 45, up: V(),
        lookAt() {}, updateProjectionMatrix() {},
      },
      controls: { target: V() },
    },
    director: {
      owned: true,
      setTransitioning() {}, applyHeroPose() {}, restoreHero() {},
    },
    lens: { setLookOverride() {} },
    ui: {
      cancelCopyEntry() { copy.cancelCopyEntry(); },
      setCopyEntryPlay(play) { copyPlay.push(play); copy.setCopyEntryPlay(play); },
    },
    chapters: {},
    guarded: (_name, fn) => fn(),
    chapterAt: (p) => ({ id: p < 0.5 ? 'mission' : 'final' }),
    placeAt() {}, paintHero() {}, heroShownNow: () => 1,
    heroPresenceNow: () => 0,
  });
  controller.beginFlight({ railWrap: ticket, railFlight: null, chapterEntry: null });
  controller.beginBlend({
    t: 0, dur: 4, play: 1,
    pos0: V(1, 0, 0), tgt0: V(), fov0: 45,
    fog: null, fogN0: 0, fogF0: 0, fogN1: 0, fogF1: 0,
    az1: null, bow: 0, rise: 0,
    look0: {}, look1: {}, look: {},
    wrapDir: -1, homeP: 0, dstX: 6,
    routeFaithful: false,
  });

  controller.stepCamBlend(0.4);
  copy.step({ chapterId: 'final', dt: 0.4, travelP: 0.97, railWrap: ticket });
  const phaseBefore = ticket.phase;
  const heroBefore = copy.ease('mission');
  const contentBefore = 1 - railWrapNavigationProgress({
    targetChapterId: 'final', phase: ticket.phase,
  });

  assert.equal(controller.steerWrapTo(0), true,
    'clicking Intro during Intro -> Purpose steers the active wrap');
  assert.equal(controller.railWrap, ticket,
    'click reversal retains the exact rail ticket instead of installing a new one');
  assert.equal(ticket.phase, phaseBefore,
    'the steering click preserves the painted rail phase');
  assert.equal(1 - railWrapNavigationProgress({
    targetChapterId: 'final', phase: ticket.phase,
  }), contentBefore, 'the steering click preserves --nav-content-u');
  assert.deepEqual(copyPlay, [-1], 'the click reverses the hero copy envelope');
  assert.equal(copy.ease('mission'), heroBefore,
    'the steering click does not repaint hero opacity');

  controller.stepCamBlend(0.1);
  copy.step({ chapterId: 'final', dt: 0.1, travelP: 0.97, railWrap: ticket });
  const contentAfter = 1 - railWrapNavigationProgress({
    targetChapterId: 'final', phase: ticket.phase,
  });
  assert.ok(ticket.phase < phaseBefore,
    'the next frame retraces the same rail phase');
  assert.ok(Math.abs(contentAfter - contentBefore) < 0.02,
    'the reversed navigation scale advances continuously, not endpoint-to-endpoint');
  assert.ok(copy.ease('mission') >= heroBefore
      && Math.abs(copy.ease('mission') - heroBefore) < 0.02,
    'the next reversed frame retraces Intro gradually without a steering-frame jump');

  assert.equal(controller.steerWrapTo(0.97), true,
    'reselecting Purpose resumes that same live wrap');
  assert.equal(controller.railWrap, ticket,
    'resuming also retains the exact rail ticket');
  assert.deepEqual(copyPlay, [-1, 1],
    'copy playback follows both directions without a replacement envelope');
}

// THE LAUNCH WINDOW IS ONE TRANSACTION. beginFlight() raises `transitioning`
// and `cameraStateDisagree` and installs the rail ticket at phase 0;
// beginBlend() is what gives the flight a clock that can ever lower them
// again. A throw between the two — the duration policy refuses a non-finite
// base, which an already-NaN camera reaches — used to leave both flags up for
// the life of the page, and the director defers every responsive setView()
// while `transitioning` is true and replays none of them. Executed rather than
// read, because the property is that dropCamBlend() is a VALID rollback for a
// flight that never got a blend: it must lower what beginFlight raised without
// a camBlend to work from.
{
  const transitioning = [];
  const stub = () => ({ clone: stub });
  const controller = createTransitionController({
    input: { claimNow: () => null },
    sceneApi: { camera: { position: stub() }, controls: { target: stub() } },
    director: {
      owned: true,
      setTransitioning(on) { transitioning.push(on); },
      applyHeroPose() {}, restoreHero() {},
    },
    lens: { setLookOverride() {} },
    ui: { cancelCopyEntry() {}, setCopyEntryPlay() {} },
    chapters: {},
    guarded: (_name, fn) => fn(),
    chapterAt: () => ({ id: 'mission' }),
    placeAt() {}, paintHero() {},
    heroShownNow: () => 0, heroPresenceNow: () => 0,
  });
  const ticket = { fromP: 0, targetP: 0.26, phase: 0 };
  controller.beginFlight({
    railWrap: null, railFlight: ticket, chapterEntry: { id: 'inspire' },
  });
  assert.equal(controller.cameraStateDisagree, true,
    'beginFlight raises the state/camera disagreement before any blend exists');
  assert.deepEqual(transitioning, [true],
    'beginFlight brackets the camera authority for the whole flight');
  assert.equal(controller.blend, null,
    'the window under test is exactly the one where the flight has no clock');
  controller.dropCamBlend();
  assert.equal(controller.cameraStateDisagree, false,
    'the rollback lowers the disagreement a blend-less flight raised');
  assert.deepEqual(transitioning, [true, false],
    'the rollback hands the camera authority back, so resize re-framing lives');
  assert.equal(controller.railFlight, null,
    'the rollback drops the ticket the launch left frozen at phase 0');
  assert.equal(controller.chapterEntry, null,
    'the rollback drops the navigation-only chapter clock with it');
}

// ...and the shipped path takes it. The three anchors are the transaction's
// three moments: opened before the flags are raised, committed only once the
// blend owns a clock, rolled back on every other way out.
assert.match(journeySource,
  /let launched = false;\n\s*try \{\n\s*transition\.beginFlight\(/,
  'the jump opens its transaction before it raises the flight flags');
assert.match(journeySource,
  /transition\.beginBlend\(\{[\s\S]*?\n\s*launched = true;/,
  'the transaction commits only once the blend owns a clock that can end it');
assert.match(journeySource,
  /\n\s*\} finally \{\n\s*if \(!launched\) transition\.dropCamBlend\(\);\n\s*\}/,
  'an unlaunched jump rolls the flight flags and its ticket back');

function assertBookendFade(label, sourceId, sourceP, destinationId, destinationP, dir) {
  const copy = makeCopyArrival();
  copy.step({ chapterId: sourceId, dt: 0, travelP: sourceP });
  assert.equal(copy.ease(sourceId), 1, `${label}: source rest starts visible`);
  copy.prepareCopyEntry(destinationId);
  // directJumpTo's placeAt() runs while the ticket is prepared but before its
  // duration is knowable. This frame used to snap the source to zero, then
  // armCopyEntry restored it — the visible off/on flash.
  copy.step({
    chapterId: destinationId,
    dt: 0,
    travelP: destinationP,
    railWrap: { dir, phase: 0 },
  });
  assert.equal(copy.ease(sourceId), 1, `${label}: dt=0 placement preserves the source`);
  assert.equal(copy.ease(destinationId), 0, `${label}: dt=0 placement keeps destination hidden`);
  copy.armCopyEntry(destinationId, 4);
  assert.equal(copy.ease(sourceId), 1, `${label}: source is preserved on arm`);
  assert.equal(copy.ease(destinationId), 0, `${label}: destination starts hidden`);
  const ticket = { dir, phase: 0.025 };
  copy.step({
    chapterId: destinationId,
    dt: 0.1,
    travelP: destinationP,
    railWrap: ticket,
  });
  assert.ok(copy.ease(sourceId) > 0 && copy.ease(sourceId) < 1,
    `${label}: source fades during the flight`);
  assert.ok(copy.ease(sourceId) >= 0.95,
    `${label}: the opening phase retains the source instead of dropping it on click`);
  assert.equal(copy.ease(destinationId), 0, `${label}: destination waits for its lead`);
  ticket.phase = 0.16;
  copy.step({ chapterId: destinationId, dt: 0.1, travelP: destinationP,
    railWrap: ticket });
  assert.ok(copy.ease(sourceId) > 0.45 && copy.ease(sourceId) < 0.55,
    `${label}: departure spends its fade across the opening third of camera travel`);
  for (let i = 0; i < 22; i++) {
    ticket.phase = 0.16 + (i + 1) * 0.02;
    copy.step({ chapterId: destinationId, dt: 0.1, travelP: destinationP,
      railWrap: ticket });
  }
  assert.equal(copy.ease(sourceId), 0,
    `${label}: source remains suppressed through the long middle of the wrap`);
  assert.equal(copy.ease(destinationId), 0,
    `${label}: destination waits until the closing third of camera travel`);
  ticket.phase = 0.84;
  copy.step({ chapterId: destinationId, dt: 0.1, travelP: destinationP,
    railWrap: ticket });
  assert.ok(copy.ease(destinationId) > 0.45 && copy.ease(destinationId) < 0.55,
    `${label}: arrival mirrors the departure at the matching camera phase`);
  ticket.phase = 1;
  copy.step({ chapterId: destinationId, dt: 0.1, travelP: destinationP,
    railWrap: ticket });
  assert.equal(copy.ease(destinationId), 1,
    `${label}: destination reaches rest with the camera, not after it`);
  copy.step({ chapterId: destinationId, dt: 1 / 60, travelP: destinationP });
  assert.equal(copy.ease(sourceId), 0, `${label}: landing does not restore the source`);
  assert.equal(copy.ease(destinationId), 1,
    `${label}: landing preserves the completed camera-phase arrival`);
}
assertBookendFade('Intro -> Purpose', 'mission', 0, 'final', 0.97, -1);
assertBookendFade('Purpose -> Intro', 'final', 0.97, 'mission', 0, 1);

// Ordinary button journeys use the same balanced opening/closing thirds.
// This is deliberately phase-based: slowing one camera route must slow both
// sides of its copy handoff by the same proportion.
{
  const nodes = Object.fromEntries(copyBlocks.map(id => [id, fakeNode()]));
  const copy = makeCopyArrival(nodes);
  copy.step({ chapterId: 'mission', dt: 0, travelP: 0 });
  const ticket = { fromP: 0, targetP: 0.26, phase: 0 };
  copy.step({ chapterId: 'inspire', dt: 0, travelP: 0, railFlight: ticket });
  ticket.phase = 0.16;
  copy.step({ chapterId: 'inspire', dt: 0.1, travelP: 0.08, railFlight: ticket });
  const departureHalf = copy.ease('mission');
  assert.ok(departureHalf > 0.45 && departureHalf < 0.55,
    'ordinary departure is halfway faded at the midpoint of its opening third');
  assert.equal(copy.ease('inspire'), 0,
    'ordinary destination waits through the camera middle');
  ticket.phase = 0.84;
  copy.step({ chapterId: 'inspire', dt: 0.1, travelP: 0.22, railFlight: ticket });
  assert.ok(Math.abs(Number(nodes.inspire.style.opacity) - departureHalf) < 0.001,
    'ordinary visible arrival mirrors departure on the same camera-phase duration');
  ticket.phase = 1;
  copy.step({ chapterId: 'inspire', dt: 0.1, travelP: 0.26, railFlight: ticket });
  assert.equal(Number(nodes.inspire.style.opacity), 1,
    'ordinary visible destination and camera land together');
  assert.equal(copy.ease('inspire'), 0.38,
    'chapter-owned landing cascades retain their declared in-flight ceiling');
}

// Reversing uses the same ticket and therefore the same painted phase. Copy
// opacity and the content-sized navigation scale cannot jump on the steering
// frame; subsequent frames retrace smoothly.
{
  const copy = makeCopyArrival();
  copy.step({ chapterId: 'mission', dt: 0, travelP: 0 });
  copy.prepareCopyEntry('final');
  copy.step({
    chapterId: 'final', dt: 0, travelP: 0.97,
    railWrap: { dir: -1, phase: 0 },
  });
  copy.armCopyEntry('final', 4);
  const ticket = { dir: -1, phase: 0.35 };
  copy.step({ chapterId: 'final', dt: 0.8, travelP: 0.97, railWrap: ticket });
  const beforeCopy = copy.ease('mission');
  const beforeDock = railWrapNavigationProgress({ targetChapterId: 'final', phase: ticket.phase });
  copy.setCopyEntryPlay(-1);
  const steeringCopy = copy.ease('mission');
  const steeringDock = railWrapNavigationProgress({ targetChapterId: 'final', phase: ticket.phase });
  assert.equal(steeringCopy, beforeCopy,
    'the steering event itself does not repaint the Intro copy');
  assert.equal(steeringDock, beforeDock,
    'the steering event itself does not change navigation scale');
  ticket.phase = 0.34;
  copy.step({ chapterId: 'final', dt: 1 / 60, travelP: 0.97, railWrap: ticket });
  assert.ok(copy.ease('mission') <= beforeCopy,
    'the next reversed frame does not reintroduce Intro while the lap is airborne');
  assert.ok(railWrapNavigationProgress({ targetChapterId: 'final', phase: ticket.phase }) <= beforeDock,
    'the next reversed frame retraces navigation scale toward the Intro size');
  ticket.phase = 0;
  copy.step({ chapterId: 'mission', dt: 0, travelP: 0 });
  assert.equal(copy.ease('mission'), 1,
    'the rewound landing restores Intro exactly when the camera reaches home');
  copy.step({ chapterId: 'mission', dt: 0, travelP: 0 });
  assert.equal(copy.ease('mission'), 1,
    'the second rewound landing placement preserves the completed crossfade');
  copy.step({ chapterId: 'mission', dt: 1 / 60, travelP: 0 });
  assert.equal(copy.ease('mission'), 1,
    'Intro stays fully arrived after the reversed camera has settled');
}

// Connect and Purpose share the organism's seven ground materials. Their dim
// requests must compose against one immutable baseline and release in either
// order without capturing or restoring a sibling's darker value.
const groundChildren = Array.from({ length: 7 }, (_, i) => ({
  visible: true,
  isPoints: i === 2 || i === 3 || i === 6,
  material: {
    uniforms: { uWin: { value: 1 }, uOpacity: { value: 1 } },
  },
}));
const dimScene = { groups: { ground: { children: groundChildren } } };
const connectDim = createHeroGroundDimClaim(dimScene, {
  keeps: [0.42, 0.42, 0.60, 0.80, 0.48, 0.52, 0.58],
});
const purposeDim = createHeroGroundDimClaim(dimScene, {
  keeps: [0.10, 0.10, 0.28, 0.55, 0.12, 0.15, 0.25],
  pointThreshold: 0.12,
});
const rootOpacity = () => groundChildren[4].material.uniforms.uOpacity.value;
connectDim.set(1);
assert.equal(rootOpacity(), 0.48, 'Connect dims roots from the canonical baseline');
purposeDim.set(1);
assert.equal(rootOpacity(), 0.12, 'the darkest simultaneous claim wins without multiplying');
purposeDim.clear();
assert.equal(rootOpacity(), 0.48, 'releasing Purpose preserves Connect\'s active claim');
connectDim.clear();
assert.equal(rootOpacity(), 1, 'releasing the final claim restores the authored root value');
purposeDim.set(1);
connectDim.set(1);
connectDim.clear();
assert.equal(rootOpacity(), 0.12, 'reverse claim order preserves Purpose\'s active dim');
purposeDim.clear();
assert.equal(rootOpacity(), 1, 'reverse release order also restores the exact baseline');

console.log('no-scroll navigation transport: ok');
