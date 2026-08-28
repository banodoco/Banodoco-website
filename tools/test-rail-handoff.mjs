#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RAIL_HANDOFF,
  applyRailHandoffState,
  railGatherX,
  railHandoffRest,
  railHandoffState,
  railHandoffVisual,
  railHandoffWrapVisual,
  railHandoffWrapPhase,
  railPurposeWrapPresence,
  railPurposeLabelStage,
  PURPOSE_LABEL_TOP_AT,
} from '../journey/ui/rail-handoff.js';
import { rowLayout } from '../journey/layout/rail-geometry.js';
import {
  PHONE_FINAL_COMPOSITION_LIFT_PX,
  cameraWorldUnitsForPixels,
} from '../journey/layout/final-composition.js';

const state = (selectedChapterId, cameraStateDisagree, flightFromId = null, flightTargetId = null) =>
  railHandoffState({ selectedChapterId, cameraStateDisagree, flightFromId, flightTargetId });

for (const chapter of ['mission', 'inspire', 'connect']) {
  assert.equal(state(chapter, false), RAIL_HANDOFF.JOURNEY,
    `${chapter} at rest keeps the ordinary journey row`);
  assert.equal(state(chapter, true), RAIL_HANDOFF.JOURNEY,
    `${chapter} in flight keeps the ordinary journey row`);
}
assert.equal(state('final', true), RAIL_HANDOFF.JOURNEY,
  'Purpose does not expose its subtree before the camera lands');
assert.equal(state('final', false), RAIL_HANDOFF.PURPOSE,
  'settled Purpose exposes its two children below the lifted row');
assert.equal(state('owned', true), RAIL_HANDOFF.OWNERSHIP_TRANSIT,
  'choosing Ownership starts its dedicated subtree indicator transit');
assert.equal(state('owned', false), RAIL_HANDOFF.OWNERSHIP,
  'settled Ownership keeps the centred Purpose subtree and hides the row');
assert.equal(state('final', true, 'owned', 'final'), RAIL_HANDOFF.OWNERSHIP_TRANSIT,
  'leaving Ownership keeps the subtree mounted for the reverse camera-paced handoff');
assert.equal(state('connect', true, 'owned', 'connect'), RAIL_HANDOFF.OWNERSHIP_TRANSIT,
  'leaving Ownership for another destination also reverses the mounted subtree');

// Purpose <-> Connect visually crosses Owned's numeric band. Visual progress
// is not an input to the projector, so the subtree cannot flash mid-flight.
for (const [selected, disagree, from, target, expected] of [
  ['connect', true, 'final', 'connect', RAIL_HANDOFF.JOURNEY],
  ['final', true, 'connect', 'final', RAIL_HANDOFF.JOURNEY],
  ['final', false, null, null, RAIL_HANDOFF.PURPOSE],
]) {
  assert.equal(state(selected, disagree, from, target), expected,
    `${from} -> ${target} has a route-endpoint-authored handoff state`);
}

assert.deepEqual(railHandoffRest('final'), { tree: 1, ownership: 0 });
assert.deepEqual(railHandoffRest('owned'), { tree: 1, ownership: 1 });
assert.deepEqual(railHandoffRest('connect'), { tree: 0, ownership: 0 });
assert.deepEqual(
  railHandoffVisual({ from: { tree: 1, ownership: 0 }, targetChapterId: 'owned', phase: 0.4 }),
  { tree: 1, ownership: 0.4 },
  'Purpose -> Ownership continuously follows the supplied camera phase',
);

const desktopRow = rowLayout(1440, 900);
assert.equal(PHONE_FINAL_COMPOSITION_LIFT_PX, 30,
  'mobile Final uses one modest screen-space composition lift');
assert.ok(cameraWorldUnitsForPixels({
  pixels: PHONE_FINAL_COMPOSITION_LIFT_PX,
  distance: 16,
  fov: 54,
  viewportHeight: 932,
}) > 0, 'the shared mobile lift has a stable camera-world conversion');
for (const phase of [0, 0.17, 0.5, 0.91, 1]) {
  const gathered = desktopRow.centres.map((centre) => centre + railGatherX({
    centre, width: desktopRow.width, phase,
  }));
  assert.equal(
    ((gathered[0] + gathered.at(-1)) / 2).toFixed(6),
    (desktopRow.width / 2).toFixed(6),
    `the converging row remains horizontally centred at ownership phase ${phase}`,
  );
}
assert.deepEqual(
  desktopRow.centres.map((centre) => centre + railGatherX({
    centre, width: desktopRow.width, phase: 1,
  })),
  desktopRow.centres.map(() => desktopRow.width / 2),
  'all five slots finish at the exact viewport-centred Purpose coordinate',
);
assert.deepEqual(
  railHandoffVisual({ from: { tree: 1, ownership: 1 }, targetChapterId: 'final', phase: 0.4 }),
  { tree: 1, ownership: 0.6 },
  'Ownership -> Purpose is the exact continuous reverse',
);
assert.deepEqual(
  railHandoffVisual({ from: { tree: 1, ownership: 0 }, targetChapterId: 'connect', phase: 0.4 }),
  { tree: 0.6, ownership: 0 },
  'Purpose -> Connect hides only from explicit endpoints and never lights Ownership',
);
assert.equal(railPurposeLabelStage({ tree: 0, ownership: 0 }), 'below',
  'ordinary row labels keep their below-mark seat before Purpose opens');
assert.equal(railPurposeLabelStage({ tree: PURPOSE_LABEL_TOP_AT * 0.5, ownership: 0 }), 'leaving',
  'opening Purpose fades below-mark labels before changing their seat');
assert.equal(railPurposeLabelStage({ tree: PURPOSE_LABEL_TOP_AT, ownership: 0 }), 'above',
  'Purpose switches to the hover-only above-mark seat after labels fade');
assert.equal(railPurposeLabelStage({ tree: 1, ownership: 0.5 }), 'gathering',
  'Ownership packing keeps the already-staged above labels quiet');
assert.deepEqual(
  [0, 0.2, 0.5, 0.83, 0.84, 1].map(tree => railPurposeLabelStage({ tree, ownership: 0 })),
  ['below', 'leaving', 'leaving', 'leaving', 'above', 'above'],
  'forward Purpose trace fades labels in place before its above-seat switch',
);
assert.deepEqual(
  [1, 0.84, 0.83, 0.5, 0.002, 0].map(tree => railPurposeLabelStage({ tree, ownership: 0 })),
  ['above', 'above', 'leaving', 'leaving', 'leaving', 'below'],
  'reverse Purpose trace re-seats labels below only after the above seat is quiet',
);
assert.deepEqual(
  railHandoffWrapVisual({
    from: railHandoffRest('mission'), targetChapterId: 'final', phase: 0.50,
  }),
  { tree: 0, ownership: 0 },
  'Mission -> Final cyclic wrap cannot reveal Purpose while its rail picture crosses the route',
);
assert.equal(
  railHandoffWrapVisual({
    from: railHandoffRest('mission'), targetChapterId: 'final', phase: 0.59,
  }).tree,
  0,
  'an explicit Final wrap keeps Purpose closed until its destination approach',
);
assert.equal(
  railHandoffWrapVisual({
    from: railHandoffRest('mission'), targetChapterId: 'final', phase: 0.80,
  }).tree.toFixed(2),
  '0.50',
  'an explicit Final wrap grows Purpose across the final 40% of camera travel',
);
assert.equal(
  railHandoffWrapVisual({
    from: railHandoffRest('mission'), targetChapterId: 'final', phase: 1,
  }).tree,
  1,
  'the explicit Final wrap reaches the complete branch at its endpoint',
);
assert.equal(
  railHandoffWrapVisual({ from: railHandoffRest('final'), phase: 0.2 }).tree.toFixed(2),
  '0.50',
  'Final -> Mission is the exact time reverse of the final 40% approach',
);
for (const phase of [0, 0.1, 0.4, 0.6, 0.8, 1]) {
  const arriving = railPurposeWrapPresence({ targetChapterId: 'final', phase });
  const leaving = railPurposeWrapPresence({ targetChapterId: 'mission', phase: 1 - phase });
  assert.equal(arriving, leaving,
    `wrap Purpose presence is reversible at camera phase ${phase}`);
  assert.equal(
    railHandoffWrapPhase({ targetChapterId: 'final', phase }),
    arriving,
    'Final approach tree/lift/scale consume one envelope',
  );
}

const surface = () => ({
  inert: false,
  attrs: new Map(),
  setAttribute(name, value) { this.attrs.set(name, value); },
  removeAttribute(name) { this.attrs.delete(name); },
});
const classes = new Set(['j-rail-handoff-journey']);
const root = {
  dataset: { handoff: RAIL_HANDOFF.JOURNEY },
  classList: {
    toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
  },
};
const journeySurface = surface();
const treeSurface = surface();
const purposeSurface = surface();
const ownershipSurface = surface();
const project = (next) => applyRailHandoffState({
  root, journeySurface, treeSurface, purposeSurface, ownershipSurface,
}, next);

project(RAIL_HANDOFF.PURPOSE);
assert.deepEqual([...classes], ['j-rail-handoff-purpose-tree']);
assert.equal(journeySurface.inert, false);
assert.equal(treeSurface.inert, false);
assert.equal(purposeSurface.inert, true,
  'the existing row item is Purpose while the five-item row is visible');
assert.equal(ownershipSurface.inert, false);
assert.equal(ownershipSurface.attrs.get('aria-disabled'), 'false');

project(RAIL_HANDOFF.OWNERSHIP_TRANSIT);
assert.deepEqual([...classes], ['j-rail-handoff-ownership-transit']);
assert.equal(journeySurface.inert, false,
  'the row remains mounted during the dedicated indicator transit');
assert.equal(treeSurface.inert, false);
assert.equal(purposeSurface.inert, true);
assert.equal(ownershipSurface.inert, true,
  'the selected Ownership child cannot be repeatedly activated in flight');

project(RAIL_HANDOFF.OWNERSHIP);
assert.deepEqual([...classes], ['j-rail-handoff-ownership-tree']);
assert.equal(journeySurface.inert, false,
  'the gathered row keeps its existing Purpose link as the sole parent');
assert.equal(journeySurface.attrs.get('aria-hidden'), 'false');
assert.equal(treeSurface.inert, false);
assert.equal(purposeSurface.inert, true,
  'the duplicate subtree Purpose parent remains permanently unavailable');
assert.equal(purposeSurface.attrs.get('aria-hidden'), 'true');
assert.equal(ownershipSurface.attrs.get('aria-current'), 'page');

project(RAIL_HANDOFF.JOURNEY);
assert.deepEqual([...classes], ['j-rail-handoff-journey']);
assert.equal(journeySurface.inert, false);
assert.equal(treeSurface.inert, true);
assert.equal(treeSurface.attrs.get('aria-hidden'), 'true');
assert.equal(ownershipSurface.attrs.has('aria-current'), false);
assert.throws(() => project('owned-coordinate'), /unknown state/,
  'an accidental coordinate-derived state must fail closed');

const css = readFileSync(new URL('../journey/site.css', import.meta.url), 'utf8');
const railSource = readFileSync(new URL('../journey/rail.js', import.meta.url), 'utf8');
const geometrySource = readFileSync(new URL('../journey/layout/rail-geometry.js', import.meta.url), 'utf8');
const canopySource = readFileSync(new URL('../journey/chapters/final/canopy.js', import.meta.url), 'utf8');
const finalWorldSource = readFileSync(new URL('../journey/chapters/final/world.js', import.meta.url), 'utf8');
const handoffCss = css.slice(
  css.indexOf('/* THE PURPOSE -> OWNERSHIP SUBTREE'),
  css.indexOf('/* ---- the items', css.indexOf('/* THE PURPOSE -> OWNERSHIP SUBTREE')),
);
assert.match(handoffCss,
  /\.j-rail-list \{[\s\S]*?top: 0;[\s\S]*?transition: none;/,
  'the subtree contract does not introduce an arrival-only row top switch');
const handoffListRule = handoffCss.match(/\.j-rail \.j-rail-list \{([\s\S]*?)\n\}/)?.[1] || '';
assert.doesNotMatch(handoffListRule, /clip-path|filter|--purpose-row-opacity/,
  'subtree morph cannot clip, blur, composite or fade the shared row and its labels/scrim');
assert.match(handoffCss,
  /\.j-rail-purpose-tree \{[\s\S]*?left: var\(--purpose-tree-x,[\s\S]*?opacity: var\(--purpose-tree-opacity,[\s\S]*?transition: none;/,
  'subtree reveal and recentering consume per-frame camera projection values');
assert.match(handoffCss,
  /\.j-rail-purpose-indicator \{[\s\S]*?--purpose-indicator-x[\s\S]*?--purpose-indicator-y[\s\S]*?transition: none;/,
  'the dedicated indicator is positioned directly from camera progress');
assert.match(handoffCss,
  /\.j-rail-purpose-tree::before[\s\S]*?purpose-trunk-length[\s\S]*?scaleY\(var\(--purpose-trunk-u[\s\S]*?transform-origin: 50% 0/,
  'the connector first grows vertically down from Purpose');
assert.match(handoffCss,
  /\.j-rail-purpose-tree::after[\s\S]*?purpose-junction-x[\s\S]*?purpose-reach-length[\s\S]*?scaleX\(var\(--purpose-reach-u[\s\S]*?transform-origin: 100% 50%/,
  'the connector then grows left into the viewport-centred junction');
assert.match(handoffCss,
  /\.j-rail-purpose-children \{[\s\S]*?left: var\(--purpose-junction-x[\s\S]*?translateX\(-50%\)/,
  'the child pair is anchored symmetrically on the viewport-centred junction');
assert.match(handoffCss,
  /\.j-rail-purpose-tree::after[\s\S]*?top: var\(--purpose-split-y[\s\S]*?\.j-rail-purpose-children \{[\s\S]*?top: var\(--purpose-child-top-y/,
  'the horizontal elbow and compact child pair share one projected vertical frame');
assert.match(handoffCss,
  /\.j-rail-purpose-children::before[\s\S]*?purpose-branch-length[\s\S]*?180deg - var\(--purpose-branch-angle[\s\S]*?scaleX\(var\(--purpose-fork-u/,
  'the left branch grows diagonally from the centred split');
assert.match(handoffCss,
  /\.j-rail-purpose-children::after[\s\S]*?purpose-branch-length[\s\S]*?rotate\(var\(--purpose-branch-angle[\s\S]*?scaleX\(var\(--purpose-fork-u/,
  'the right branch mirrors the left from the same split');
assert.match(handoffCss,
  /\.j-rail-purpose-child::before \{ content: none !important; \}/,
  'no stepped child stems remain in the clean angular split');
assert.match(handoffCss,
  /\.j-rail-slot\.j-rail-purpose-ownership[\s\S]*?purpose-child-shift-x[\s\S]*?purpose-child-scale/,
  'Ownership translates and scales toward lower-left from the junction');
assert.match(handoffCss,
  /\.j-rail-slot\.j-rail-purpose-manifesto[\s\S]*?purpose-child-shift-x[\s\S]*?purpose-child-scale/,
  'Manifesto mirrors the growth toward lower-right');
assert.match(handoffCss,
  /\.j-rail-purpose-child \.j-rail-mark[\s\S]*?clip-path: circle\(var\(--purpose-mark-clip-radius/,
  'only each drawn child mark is clipped while it opens from the junction');
const purposeChildrenRule = handoffCss.match(/\.j-rail \.j-rail-purpose-children \{([\s\S]*?)\n\}/)?.[1] || '';
assert.doesNotMatch(purposeChildrenRule, /clip-path/,
  'the child container never clips its below-box Ownership and Manifesto labels');
assert.doesNotMatch(handoffCss, /j-rail-wave|@keyframes|animation\s*:/,
  'the subtree does not borrow the ordinary wave or a keyframe animation');

assert.match(railSource,
  /paintPurposeHandoff\(nowNext, railFlight, railWrap\)/,
  'the handoff projection is repainted from the live rail/camera ticket each frame');
assert.match(railSource,
  /const ticket = flight \|\| wrap[\s\S]*?railHandoffWrapVisual\(\{[\s\S]*?targetChapterId: selectedChapterId/,
  'cyclic wraps use the explicit route endpoint instead of their numeric traversal coordinate');
assert.match(railSource,
  /else \{[\s\S]*?handoffFlight = null;[\s\S]*?handoffVisual = railHandoffRest\(selectedChapterId\);/,
  'after landing, exact semantic rest replaces noisy numeric settling residue');
assert.match(railSource,
  /const trunkU =[\s\S]*?const reachU =[\s\S]*?const forkU =[\s\S]*?const childU =[\s\S]*?--purpose-child-scale/,
  'vertical, horizontal, fork and child growth are staged from the same live camera projection');
assert.match(railSource,
  /const treeX = purposeX \* \(1 - ownershipU\)[\s\S]*?const junctionX = -treeX \/ treeScale[\s\S]*?--purpose-junction-x/,
  'the Purpose root follows its row slot while the scaled child junction stays viewport-centred');
assert.doesNotMatch(railSource, /--purpose-row-(?:clip|blur|opacity)/,
  'the camera projector never mutates the shared row surface');
assert.match(railSource,
  /--purpose-rail-lift'[\s\S]*?L\.purposeLift \* treeU/,
  'the Purpose seat lift is continuously projected from the same camera phase as its tree');
assert.doesNotMatch(railSource, /--purpose-row-top/,
  'the camera projector never switches the row to a second top coordinate');
assert.match(railSource,
  /handoffFlight !== ticket[\s\S]*?handoffFrom = \{ \.\.\.handoffVisual \}/,
  'an interrupted or reversed flight captures the currently painted values');
assert.match(railSource,
  /slots\.forEach\(\(slot, index\)[\s\S]*?railGatherX\(\{[\s\S]*?centre: L\.centres\[index\][\s\S]*?slot\.li\.style\.setProperty\('--purpose-gather-x'/,
  'all row slots converge horizontally while retaining their authored size');
assert.doesNotMatch(railSource, /purpose-gather-scale|targetScale = slot\.id === 'final'/,
  'Ownership packing has no shrink/fade scale path');
assert.match(railSource,
  /--purpose-gather-open-u.*1 - ownershipU/,
  'Ownership packing publishes a camera-driven open fraction for connectors and peers');
assert.match(css,
  /\.j-rail\.j-rail-purpose-gathering \.j-rail-list > \.j-rail-slot::after[\s\S]*?scaleX\(var\(--purpose-gather-open-u, 1\)\)/,
  'top-row connectors continuously retract with the inward gather');
assert.match(css,
  /\.j-rail\.j-rail-purpose-gathering \.j-rail-list > \.j-rail-slot:not\(\[data-chapter="final"\]\) \.j-rail-item[\s\S]*?opacity: calc\(var\(--purpose-peer-base-opacity, 1\) \* var\(--purpose-gather-open-u, 1\)\) !important;/,
  'non-Purpose peers fade by camera phase while retaining their authored size');
const ownershipTrace = [0, 0.35, 0.7, 1, 0.7, 0.35, 0];
assert.deepEqual(
  ownershipTrace.map(ownership => +(1 - ownership).toFixed(2)),
  [1, 0.65, 0.3, 0, 0.3, 0.65, 1],
  'midpoint and reverse gather traces retract and redraw connectors/peer ink symmetrically',
);
assert.match(railSource,
  /const labelStage = railPurposeLabelStage[\s\S]*?j-rail-purpose-labels-[\s\S]*?--purpose-label-fade/,
  'row label seats and their fade are projected from the same handoff frame');
assert.match(railSource,
  /const gatheredAway = slot\.id !== 'final' && ownershipU >= 0\.9999[\s\S]*?slot\.li\.style\.visibility = gatheredAway \? 'hidden' : ''/,
  'fully covered peer slots hide only at the exact gather endpoint');
assert.match(railSource,
  /j-rail-purpose-gathering', ownershipU > 0\.001/,
  'Purpose arrival cannot activate horizontal gathering unless the explicit Ownership phase is nonzero');
assert.match(railSource,
  /gatheredAway = slot\.id !== 'final' && ownershipU >= 0\.9999[\s\S]*?slot\.item\.inert = gatheredAway/,
  'fully absorbed non-Purpose controls leave interaction and accessibility surfaces');
assert.match(geometrySource,
  /centreFromBottom: phone \? 70 : tablet \? 84 : 92,[\s\S]*?purposeLift: phone \? 50 \+ PHONE_FINAL_COMPOSITION_LIFT_PX : tablet \? 52 : 66/,
  'ordinary chapters keep their established seat while mobile Purpose adds the shared Final composition lift');
assert.match(geometrySource,
  /return Object\.freeze\(\{[\s\S]*?purposeLift: m\.purposeLift/,
  'rowLayout forwards the Purpose lift consumed by the live rail frame');
assert.match(css,
  /translateY\(calc\(-1 \* var\(--purpose-rail-lift, 0px\)\)\)/,
  'the shared row consumes the continuous Purpose lift without a CSS animation clock');
assert.match(css,
  /\.j-rail-purpose-tree \{[\s\S]*?transform: translateY\(calc\(-1 \* var\(--purpose-rail-lift, 0px\)\)\)/,
  'the subtree follows the exact same lifted baseline as its Purpose parent');
assert.match(railSource,
  /if \(horizontalWrap\)[\s\S]*?u = railPurposeWrapPresence\(horizontalWrap\)/,
  'cyclic nav scale uses the exact same endpoint presence as Purpose lift/tree');
assert.match(handoffCss,
  /j-rail-handoff-ownership-transit \.j-rail-active-ring,[\s\S]*?opacity: 0 !important/,
  'the ordinary indicator yields immediately while the dedicated Ownership indicator owns transit');
assert.match(railSource,
  /connectorStartY = L\.minorRingD \/ 2[\s\S]*?ELBOW_LIFT_PX = 8[\s\S]*?splitY = L\.major \/ 2 \+ 26 - ELBOW_LIFT_PX[\s\S]*?childLift = 6[\s\S]*?childTopY = splitY - childLift[\s\S]*?branchDrop = L\.major \/ 2 - childLift[\s\S]*?branchLength = Math\.hypot\(childOffset, branchDrop\)[\s\S]*?indicatorSplitAt = 0\.70[\s\S]*?indicatorReachU[\s\S]*?indicatorBranchU[\s\S]*?indicatorEndY = childTopY \+ L\.major \/ 2 \+ \(L\.major \/ 2 \+ 26\) \/ treeScale[\s\S]*?indicatorX[\s\S]*?indicatorY[\s\S]*?--purpose-indicator-x/,
  'the lifted elbow and child pair preserve connected branch endpoints while the dedicated dot still finishes at Ownership\'s standard below-icon seat');
assert.match(railSource,
  /--purpose-active-node-lift'[\s\S]*?ELBOW_LIFT_PX \* treeU/,
  'the ordinary Purpose dot rises reversibly to the lifted elbow on the same tree coordinate');
assert.match(css,
  /\.j-rail \.j-rail-active-ring \{[\s\S]*?top: calc\(50% \+ var\(--nav-major\) \/ 2 \+ 26px[\s\S]*?- var\(--purpose-active-node-lift, 0px\)\)/,
  'the ordinary active dot consumes the projected elbow lift instead of jumping at Ownership handoff');
assert.doesNotMatch(railSource,
  /indicatorVerticalU|indicatorTurnAt/,
  'the first dedicated-dot frame cannot jump upward along Purpose\'s vertical trunk');
assert.match(geometrySource,
  /minorRingD: phone \? 24 : tablet \? 26 : 28[\s\S]*?minorRingD: m\.minorRingD/,
  'the trunk begins at the responsive Purpose ring edge from shared geometry');
assert.match(railSource,
  /ownershipSlot\.classList\.toggle\([\s\S]*?'active'[\s\S]*?selectedChapterId === 'owned' && ownershipU >= 0\.9999/,
  'settled Ownership reuses the standard selected class at its exact endpoint');
assert.match(css,
  /\.j-rail \.j-rail-slot:is\(\.j-rail-major, \.j-rail-minor\)\.active \.j-rail-mark::after \{[\s\S]*?border-width: 1px;[\s\S]*?rgba\(248, 208, 112, 0\.95\)[\s\S]*?0 0 7px/,
  'the shared active class owns Ownership and Inspire ring weight/glow parity');
assert.match(railSource,
  /ownershipGrowthX[\s\S]*?treeScale = 1 \+ 0\.10 \* ownershipGrowth[\s\S]*?--purpose-tree-scale/,
  'the complete Purpose subtree grows modestly and continuously near settled Ownership');
assert.match(css,
  /\.j-rail-slot\.j-rail-purpose-child \.j-rail-name,[\s\S]*?font-size: 0\.76rem !important;[\s\S]*?letter-spacing: 0\.02em !important/,
  'Ownership and Manifesto labels use the same type specimen as Inspire');
assert.match(css,
  /\.j-rail \.j-rail-slot\.j-rail-purpose-child \.j-rail-name \{[\s\S]*?color: var\(--parchment\);[\s\S]*?opacity: 1;/,
  'both child labels remain fully legible at rest before Ownership selection');
assert.match(finalWorldSource,
  /uNavPocketPx[\s\S]*?gl_FragCoord\.xy[\s\S]*?navPocket[\s\S]*?makeStrandMat/,
  'every Final bed-line material removes strokes behind the shared subtree pocket');
assert.match(canopySource,
  /uniforms\.uNavPocketPx\.value\.set\([\s\S]*?width \* 0\.5 \* dpr/,
  'the shared Final line pocket follows responsive viewport and device pixel ratio');
assert.doesNotMatch(handoffCss, /background: radial-gradient|backdrop-filter/,
  'the subtree pocket cannot regress into a visible DOM scrim');
assert.match(css,
  /\.j-rail\.j-rail-purpose-labels-leaving \.j-rail-list > \.j-rail-slot[\s\S]*?opacity: var\(--purpose-label-fade, 0\) !important;[\s\S]*?\.j-rail:is\(\.j-rail-purpose-labels-above, \.j-rail-purpose-labels-gathering\)[\s\S]*?bottom: calc\(50% \+ var\(--item-d\) \/ 2 \+ 5px\);[\s\S]*?opacity: 0;/,
  'Purpose fades below-mark labels before seating their hover answer above each mark');
assert.match(css,
  /\.j-rail\.j-rail-purpose-labels-above \.j-rail-list > \.j-rail-slot[\s\S]*?> \.j-rail-item:is\(:hover, :focus-visible\) > \.j-rail-name[\s\S]*?opacity: 1;/,
  'top-row labels reveal individually for pointer and keyboard focus');
assert.doesNotMatch(css,
  /@media \(max-width: 360px\)[\s\S]*?\.j-rail-purpose-child \.j-rail-name/,
  'the centred child pair keeps the same symmetric label seat at the 320px floor');
assert.match(railSource,
  /j-rail-slot j-rail-minor j-rail-purpose-child j-rail-purpose-ownership/,
  'Ownership uses Purpose\'s minor visible circle/icon scale');
assert.match(railSource,
  /j-rail-slot j-rail-minor j-rail-purpose-child j-rail-purpose-manifesto/,
  'Manifesto uses Purpose\'s minor visible circle/icon scale');

assert.match(railSource,
  /const manifestoItem = el\('span', 'j-rail-item j-rail-soon-item'\)/,
  'Manifesto is an unavailable span, not a link');
assert.match(railSource,
  /Manifesto[\s\S]*?j-rail-soon-note', 'Soon'[\s\S]*?pointerType !== 'touch'[\s\S]*?1600/,
  'Manifesto uses Equip\'s exact Soon swap and timed touch semantic');
assert.doesNotMatch(railSource, /manifestoItem\.href|navigate\('manifesto'\)/,
  'Manifesto cannot mint a route');
assert.match(css,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.j-rail \.j-rail-list,[\s\S]*?\.j-rail \.j-rail-purpose-tree,[\s\S]*?\.j-rail \.j-rail-purpose-indicator,[\s\S]*?transition: none !important;/,
  'reduced motion switches the row, subtree and dedicated indicator instantly');

console.log('Purpose/Ownership subtree handoff: ok');
