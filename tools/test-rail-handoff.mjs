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
  railOwnershipIndicatorVisibility,
  railPurposeWrapPresence, railWrapNavigationProgress,
  railWrapCoreLabelPresence,
  railWrapVisualChapter,
  railPurposeLabelStage,
  PURPOSE_LABEL_TOP_AT,
  OWNERSHIP_INDICATOR_OCCLUSION_FLOOR,
} from '../journey/ui/rail-handoff.js';
import { rowLayout } from '../journey/layout/rail-geometry.js';
import {
  PHONE_FINAL_COMPOSITION_LIFT_PX,
  PHONE_FINAL_SCENE_LIFT_PX,
  PURPOSE_NAV_POCKET_STRENGTH,
  cameraWorldUnitsForPixels,
  purposeNavPocket,
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
  [0, 0.2, 0.49, 0.5, 0.8, 1].map(phase => railWrapVisualChapter({
    homeChapterId: 'final', targetChapterId: 'mission', phase,
  })),
  ['final', 'final', 'final', 'mission', 'mission', 'mission'],
  'a Purpose/Intro orbit stages only its two real endpoints',
);
assert.deepEqual(
  [0, 0.11, 0.22, 0.5, 0.78, 0.89, 1].map(phase =>
    +railWrapCoreLabelPresence({ targetChapterId: 'final', phase }).toFixed(3)),
  [1, 0.5, 0, 0, 0, 0, 0],
  'Intro core labels fade only on the early departure toward Purpose',
);
assert.deepEqual(
  [0, 0.11, 0.22, 0.5, 0.78, 0.89, 1].map(phase =>
    +railWrapCoreLabelPresence({ targetChapterId: 'mission', phase }).toFixed(3)),
  [0, 0, 0, 0, 0, 0.5, 1],
  'Intro core labels return only on the final approach from Purpose',
);
assert.deepEqual(
  railHandoffVisual({ from: { tree: 1, ownership: 0 }, targetChapterId: 'owned', phase: 0.4 }),
  { tree: 1, ownership: 0.4 },
  'Purpose -> Ownership continuously follows the supplied camera phase',
);
assert.deepEqual(
  [
    railOwnershipIndicatorVisibility({ diagonal: 0.72, vertical: 0 }),
    railOwnershipIndicatorVisibility({ diagonal: 1, vertical: 0 }),
    railOwnershipIndicatorVisibility({ diagonal: 1, vertical: 0.62 }),
    railOwnershipIndicatorVisibility({ diagonal: 1, vertical: 0.81 }),
    railOwnershipIndicatorVisibility({ diagonal: 1, vertical: 1 }),
  ].map(value => +value.toFixed(3)),
  [1, OWNERSHIP_INDICATOR_OCCLUSION_FLOOR, OWNERSHIP_INDICATOR_OCCLUSION_FLOOR,
    +((1 + OWNERSHIP_INDICATOR_OCCLUSION_FLOOR) / 2).toFixed(3), 1],
  'the travelling dot dims behind the Ownership icon/text without vanishing, then eases out',
);

const desktopRow = rowLayout(1440, 900);
const phoneRow = rowLayout(390, 844);
assert.equal(desktopRow.connectorAir, 6,
  'desktop connectors share a six-pixel optical clearance');
assert.equal(phoneRow.connectorAir, 5,
  'phone connectors retain the responsive five-pixel optical clearance');
assert.deepEqual(desktopRow.ringDia, [28, 36, 36, 36, 28],
  'row geometry owns each visible ring diameter as well as its hit box');
for (const row of [desktopRow, phoneRow]) {
  for (let index = 0; index < row.centres.length - 1; index++) {
    const segmentStart = row.centres[index]
      + row.ringDia[index] / 2 + row.connectorAir;
    const segmentEnd = row.centres[index + 1]
      - row.ringDia[index + 1] / 2 - row.connectorAir;
    const slotLeft = row.centres[index] - row.dia[index] / 2;
    const prebootLeft = row.dia[index] / 2
      + row.ringDia[index] / 2 + row.connectorAir;
    const prebootWidth = row.dia[index] / 2 + row.gap
      + row.dia[index + 1] / 2
      - row.ringDia[index] / 2 - row.ringDia[index + 1] / 2
      - 2 * row.connectorAir;
    assert.ok(segmentEnd > segmentStart,
      `responsive row connector ${index} retains a visible positive segment`);
    assert.equal(prebootLeft, segmentStart - slotLeft,
      `preboot connector ${index} starts at the settled source-ring edge`);
    assert.equal(prebootWidth, segmentEnd - segmentStart,
      `preboot connector ${index} has the settled width before JS starts`);
    assert.equal(
      segmentStart - (row.centres[index] + row.ringDia[index] / 2),
      row.connectorAir,
      `connector ${index} leaves shared air after its source ring`,
    );
    assert.equal(
      (row.centres[index + 1] - row.ringDia[index + 1] / 2) - segmentEnd,
      row.connectorAir,
      `connector ${index} leaves shared air before its destination ring`,
    );
  }
}
assert.equal(PHONE_FINAL_COMPOSITION_LIFT_PX, 30,
  'mobile Final keeps the fixed copy/navigation lift modest');
assert.equal(PHONE_FINAL_SCENE_LIFT_PX, 72,
  'mobile Final gives its background camera a stronger independent lift');
assert.ok(PURPOSE_NAV_POCKET_STRENGTH > 0.7 && PURPOSE_NAV_POCKET_STRENGTH < 0.9,
  'the Purpose pocket clears crossing linework without blacking out the scene');

/* THE POCKET IS A COVERAGE PROPERTY, NOT A RECTANGLE (converted 2026-08-30).
   Two deepEqual pins used to record this ellipse at 1440x900 and at 390x844.
   They were green the whole time the absence STOPPED ABOVE THE FORK IT EXISTS
   FOR: its full-strength core ended 69px above the frame's bottom edge while
   the Ownership/Manifesto labels sit at ~46, so the field behind those labels
   was at 99% of its brightness — at every laptop size, not only the 14-inch
   one the owner reported. A coordinate cannot see that, because the fault was
   never that the numbers had moved.
   What the pocket is FOR is covering the instrument, so that is what is
   asserted, and across every band the instrument has a seat in rather than at
   the one viewport the old pins happened to name. The shader
   (chapters/final/world.js STRAND_FRAG) holds full strength inside 0.68 of
   the ellipse and ramps out by 1.08, so the CORE is the load-bearing span and
   the outer edge is what must stay out of the composition. */
const POCKET_CORE = 0.68;
const POCKET_EDGE = 1.08;
/* How far below the row's own centre line the child fork and its two labels
   reach. rail.js builds the fork out of `major` (ring, drop, ring) and the
   labels hang under it; this is that depth expressed against the same
   number, so it tracks the bands instead of being a desktop pixel. */
// (2026-10-04) the fork is one arm down (Ownership: 1.1 major, half a hit
// box, its word) and one arm up (Manifesto, mirrored)
const forkReach = (major) => 1.6 * major + 16;
const POCKET_VIEWPORTS = [
  [1366, 768], [1440, 900], [1512, 982], [1600, 1000], [1680, 1050],  // laptops
  [744, 1133], [768, 1024], [820, 1180],                              // tablets
  [430, 932], [390, 844], [375, 667],                                 // phones
];
for (const [w, h] of POCKET_VIEWPORTS) {
  const p = purposeNavPocket({ width: w, height: h });
  const row = rowLayout(w, h);
  // the seat the Purpose instrument actually occupies, measured from the
  // bottom edge the shader's gl_FragCoord shares with it
  const rowCentre = (h - row.centreY) + row.purposeLift;
  const coreTop = p.y + POCKET_CORE * p.halfHeight;
  const coreBottom = p.y - POCKET_CORE * p.halfHeight;
  assert.equal(p.x, w / 2,
    `${w}x${h}: the absence sits on the axis the child fork is centred on`);
  assert.ok(coreTop >= rowCentre,
    `${w}x${h}: the core reaches the row's own centre line `
    + `(${coreTop.toFixed(1)} vs ${rowCentre})`);
  assert.ok(coreBottom <= rowCentre - forkReach(row.major),
    `${w}x${h}: the core reaches past the fork's labels `
    + `(${coreBottom.toFixed(1)} vs ${(rowCentre - forkReach(row.major)).toFixed(1)})`);
  assert.ok(p.y + POCKET_EDGE * p.halfHeight <= 0.30 * h,
    `${w}x${h}: the absence stays in the navigator's band and never climbs `
    + `into the composition (${(p.y + POCKET_EDGE * p.halfHeight).toFixed(1)} `
    + `vs ${(0.30 * h).toFixed(1)})`);
}
/* A wide frame can also afford to span the instrument's ENDS, which is where
   the near-vertical arteries cross it. A narrow one deliberately cannot — half
   a row past the row on a 390 phone would be 79% of the frame — which is what
   the width * 0.35 branch is for, and why this clause is scoped. */
for (const [w, h] of POCKET_VIEWPORTS.filter(([w2]) => w2 >= 1024)) {
  const p = purposeNavPocket({ width: w, height: h });
  assert.ok(p.halfWidth >= rowLayout(w, h).width / 2 + 20,
    `${w}x${h}: the absence covers the instrument's ends, where the arteries cross`);
}
assert.ok(cameraWorldUnitsForPixels({
  pixels: PHONE_FINAL_SCENE_LIFT_PX,
  distance: 16,
  fov: 54,
  viewportHeight: 932,
}) > 0, 'the mobile scene lift has a stable camera-world conversion');
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
  assert.deepEqual(
    [railHandoffWrapPhase({ targetChapterId: 'final', phase }), railWrapNavigationProgress({ targetChapterId: 'final', phase }), railWrapNavigationProgress({ targetChapterId: 'mission', phase: 1 - phase })].map(value => value.toFixed(5)),
    [arriving, phase, phase].map(value => value.toFixed(5)),
    'Purpose keeps its approach envelope while the nav pose spans and reverses across the full wrap',
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
const finalIndexSource = readFileSync(new URL('../journey/chapters/final/index.js', import.meta.url), 'utf8');
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
assert.doesNotMatch(handoffCss, /--purpose-(?:trunk|reach|junction|split-y|child-top-y|branch-origin-y|child-gap|child-shift)/,
  'the old L-pipe (trunk, reach, centred junction) is gone: the arms leave Purpose itself');
assert.match(handoffCss,
  /\.j-rail \.j-rail-purpose-children \{[\s\S]*?left: 0;[\s\S]*?top: 0;/,
  'the children are placed in the tree frame, whose origin is Purpose\'s icon centre');
assert.match(handoffCss,
  /\.j-rail-purpose-children::before \{[\s\S]*?--purpose-manifesto-length[\s\S]*?rotate\(var\(--purpose-manifesto-angle[\s\S]*?translateX\(var\(--purpose-branch-start[\s\S]*?scaleX\(var\(--purpose-fork-u/,
  'the Manifesto arm runs from Purpose\'s ring toward Manifesto, after shared air');
assert.match(handoffCss,
  /\.j-rail-purpose-children::after \{[\s\S]*?--purpose-ownership-length[\s\S]*?rotate\(var\(--purpose-ownership-angle[\s\S]*?translateX\(var\(--purpose-branch-start[\s\S]*?scaleX\(var\(--purpose-fork-u/,
  'the Ownership arm runs from Purpose\'s ring toward Ownership, after shared air');
assert.match(handoffCss,
  /\.j-rail-purpose-child::before \{ content: none !important; \}/,
  'no stepped child stems remain');
assert.match(handoffCss,
  /\.j-rail-purpose-children > \.j-rail-slot\.j-rail-purpose-ownership \{[\s\S]*?--purpose-ownership-x[\s\S]*?--purpose-ownership-y[\s\S]*?purpose-child-scale/,
  'Ownership is placed by its own centre and grows in place');
assert.match(handoffCss,
  /\.j-rail-purpose-children > \.j-rail-slot\.j-rail-purpose-manifesto \{[\s\S]*?--purpose-manifesto-x[\s\S]*?--purpose-manifesto-y[\s\S]*?purpose-child-scale/,
  'Manifesto is placed by its own centre and grows in place');
assert.match(handoffCss,
  /\.j-rail-purpose-manifesto \.j-rail-name,[\s\S]*?top: auto !important;[\s\S]*?bottom: calc\(50% \+ var\(--item-d\) \/ 2 \+ 4px\) !important;/,
  'the up-branch\'s word sits above its mark');
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
// 2026-10-04: beside the row the children keep their half-pitch place toward
// Connect; once the row has gathered away (inside Ownership or the
// Manifesto) the arms open into a low, long jaw — reaching further back than
// they rise — one blend on the gather.
assert.match(railSource,
  /const OWN_REACH_X = L\.major \* 2\.1;\s*const OWN_REACH_Y = L\.major \* 0\.95;\s*const REST_X = -pitch \/ 2 \+ \(-OWN_REACH_X \+ pitch \/ 2\) \* ownU;\s*const REST_Y = L\.major \* 1\.1 \+ \(OWN_REACH_Y - L\.major \* 1\.1\) \* ownU;[\s\S]*?const childAt = \(side\) => \(\{ x: REST_X \* emerge, y: side \* REST_Y \* emerge \}\);/,
  'one tree: Manifesto (side -1) above the row, Ownership below it, half a pitch back toward Connect beside the row, opened into a wide low jaw once it gathers');
assert.match(railSource,
  /const openedLift = Math\.max\(0, REST_Y - L\.major \* 1\.1\);[\s\S]*?--purpose-rail-lift'[\s\S]*?\+ openedLift/,
  'an opened tree that reaches further down is paid upward, so the lowest seat does not move');
assert.match(railSource,
  /const groupShift = \(-REST_X \/ 2\) \* horizontalGatherU;[\s\S]*?gatherX \+ groupShift/,
  'inside a branch the same tree is centred as a group');
assert.match(railSource,
  /const horizontalGatherU = gatheredAt > hubAt[\s\S]*?const treeX = purposeX \* \(1 - horizontalGatherU\) \+ groupShift/,
  'one horizontal front moves Purpose to the centre while the dot rides it');
assert.doesNotMatch(railSource, /--purpose-row-(?:clip|blur|opacity)/,
  'the camera projector never mutates the shared row surface');
assert.match(railSource,
  /--purpose-rail-lift'[\s\S]*?L\.purposeLift \* navPoseU/,
  'the Purpose seat lift is continuously projected from the full navigation-pose phase');
assert.doesNotMatch(railSource, /--purpose-row-top/,
  'the camera projector never switches the row to a second top coordinate');
assert.match(railSource,
  /handoffFlight !== ticket[\s\S]*?handoffFrom = \{ \.\.\.handoffVisual \}/,
  'an interrupted or reversed flight captures the currently painted values');
assert.match(railSource,
  /slots\.forEach\(\(slot, index\)[\s\S]*?railGatherX\(\{[\s\S]*?centre: L\.centres\[index\][\s\S]*?phase: horizontalGatherU[\s\S]*?slot\.li\.style\.setProperty\('--purpose-gather-x'/,
  'all row slots converge on the same horizontal front as the indicator');
assert.doesNotMatch(railSource, /purpose-gather-scale|targetScale = slot\.id === 'final'/,
  'Ownership packing has no shrink/fade scale path');
assert.match(railSource,
  /--purpose-gather-open-u.*1 - horizontalGatherU/,
  'Ownership packing publishes the indicator-paced open fraction for connectors');
assert.match(railSource,
  /--purpose-peer-open-u'[^\n]*\n[\s\S]*?gatherU \/ 0\.82/,
  'non-Purpose peers use an earlier camera-paced fade envelope');
assert.match(css,
  /\.j-rail\.j-rail-purpose-gathering \.j-rail-list > \.j-rail-slot::after[\s\S]*?scaleX\(var\(--purpose-gather-open-u, 1\)\)/,
  'top-row connectors continuously retract with the inward gather');
assert.match(css,
  /\.j-rail\.j-rail-purpose-gathering \.j-rail-list > \.j-rail-slot:not\(\[data-chapter="final"\]\) \.j-rail-item[\s\S]*?opacity: calc\(var\(--purpose-peer-base-opacity, 1\) \* var\(--purpose-peer-open-u, 1\)\) !important;/,
  'non-Purpose peers fade slightly early while retaining their authored size');
assert.match(css,
  /\.j-rail\.j-rail-purpose-gathering[\s\S]*?\[data-chapter="final"\] \.j-rail-item \{[\s\S]*?color: rgba\(246, 208, 126, 1\) !important;[\s\S]*?opacity: 1 !important;[\s\S]*?\[data-chapter="final"\] \.j-rail-mark::after \{[\s\S]*?rgba\(248, 208, 112, 0\.95\)/,
  'Purpose keeps its amber ink and ring throughout the gather');
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
  /const gatheredAway = slot\.id !== 'final' && gatherU >= 0\.9999[\s\S]*?slot\.li\.style\.visibility = gatheredAway \? 'hidden' : ''/,
  'fully covered peer slots hide only at the exact gather endpoint');
assert.match(railSource,
  /j-rail-purpose-gathering', gatherU > 0\.001/,
  'Purpose arrival cannot activate horizontal gathering unless the explicit Ownership phase is nonzero');
assert.match(railSource,
  /gatheredAway = slot\.id !== 'final' && gatherU >= 0\.9999[\s\S]*?slot\.item\.inert = gatheredAway/,
  'fully absorbed non-Purpose controls leave interaction and accessibility surfaces');
assert.match(geometrySource,
  /centreFromBottom: phone \? 70 : tablet \? 84 : 92,[\s\S]*?purposeLift: phone \? 10 \+ PHONE_FINAL_COMPOSITION_LIFT_PX : tablet \? 30 : 34/,
  'ordinary chapters keep their established seat while mobile Purpose adds the shared Final composition lift and 5px lower nudge');
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
  /if \(horizontalWrap\)[\s\S]*?u = railWrapNavigationProgress\(horizontalWrap\)/,
  'cyclic nav scale consumes the entire reversible camera lap');
assert.match(handoffCss,
  /j-rail-handoff-ownership-transit \.j-rail-active-ring,[\s\S]*?opacity: 0 !important/,
  'the ordinary indicator yields immediately while the dedicated Ownership indicator owns transit');
assert.match(railSource,
  /const HUB_SHARE = 0\.12;[\s\S]*?const horizontalGatherU = gatheredAt > hubAt[\s\S]*?seg\(gatherU, hubAt, gatheredAt\)[\s\S]*?if \(branchU <= hubAt\) \{[\s\S]*?indicatorY = purposeSeatY \* \(1 - seg\(branchU, 0, hubAt\)\);[\s\S]*?\} else if \(branchU <= gatheredAt\) \{[\s\S]*?indicatorX = 0; indicatorY = 0;[\s\S]*?indicatorX = child\.x \* k; indicatorY = child\.y \* k;[\s\S]*?indicatorY = child\.y \+ branchSide \* seatD \* seg\(branchU, iconAt, 1\)/,
  'the dot enters Purpose quickly, rides its centre while the row gathers, then runs the arm into the child\'s centre');
assert.match(railSource,
  /let branchU = crossing[\s\S]*?gatheredAt \+ \(1 - gatheredAt\) \* Math\.abs\(ownershipU - manifestoU\)/,
  'a sibling crossing runs the arms through Purpose\'s centre exactly once');
// 2026-10-04: the Manifesto side of the route is scaled by the camera's climb
// (setManifestoArrive), and the cap is held while the page is being left.
assert.match(railSource,
  /if \(manifestoOpen\) manifestoArrive = [^\n]*;\s*else if \(manifestoU <= 0\.001\) manifestoArrive = 0;\s*[\s\S]*?if \(branchSide < 0 && branchU > gatheredAt\) \{\s*branchU = gatheredAt \+ \(branchU - gatheredAt\) \* manifestoArrive;/,
  'the dot climbs to the Manifesto with the camera and leaves from where it was painted');
// 2026-10-04: every dot rests at its mark's centre, behind it, and is seen
// only out on the line between marks.
assert.match(css,
  /\.j-rail \.j-rail-active-ring \{[\s\S]*?top: 50%;[\s\S]*?z-index: 0;/,
  'the row dot rides the connectors\' height, beneath the marks');
assert.match(railSource,
  /const purposeSeatY = 0;\s*const seatD = 0;/,
  'the branch dot\'s seats are the marks\' own centres');
assert.match(railSource,
  /underMark = Math\.min\(underMark, clearOfMark\(Math\.abs\(ringX - L\.centres\[i\]\), L\.ringDia\[i\] \/ 2\)\)[\s\S]*?ringOpacity \* dockingU \* underMark/,
  'the row dot is out of sight under every mark it reaches or passes');
assert.match(railSource,
  /const UNDER_PURPOSE = 0, UNDER_CHILD = UNDER_PURPOSE;/,
  'the branch dot is out of sight under every mark');
assert.equal(
  new Function(railSource.match(/const DOT_RADIUS = [^;]+;\nfunction clearOfMark[\s\S]*?\n\}/)[0] + '; return clearOfMark(0, 12);')(),
  0, 'a dot at a mark\'s centre is fully hidden');
assert.doesNotMatch(railSource,
  /indicatorSplitAt|indicatorBranchU|indicatorTurnAt/,
  'the dedicated dot has no shortcut or legacy elbow jump path');
assert.match(geometrySource,
  /majorRingD: phone \? 30 : tablet \? 34 : 36[\s\S]*?minorRingD: phone \? 24 : tablet \? 26 : 28[\s\S]*?connectorAir: phone \? 5 : tablet \? 5 : 6[\s\S]*?ringDia: Object\.freeze\(ringDia\)/,
  'visible ring diameters and connector air share one responsive geometry owner');
assert.match(railSource,
  /ownershipSlot\.classList\.toggle\([\s\S]*?'active'[\s\S]*?selectedChapterId === 'owned' && ownershipU >= 0\.9999/,
  'settled Ownership reuses the standard selected class at its exact endpoint');
assert.match(css,
  /\.j-rail \.j-rail-slot:is\(\.j-rail-major, \.j-rail-minor\)\.active \.j-rail-mark::after \{[\s\S]*?border-width: 1px;[\s\S]*?rgba\(248, 208, 112, 0\.95\)[\s\S]*?0 0 7px/,
  'the shared active class owns Ownership and Inspire ring weight/glow parity');
assert.match(railSource,
  /const treeScale = 1;[\s\S]*?--purpose-tree-scale/,
  'the Purpose subtree keeps its size inside a branch');
assert.match(css,
  /\.j-rail-slot\.j-rail-purpose-child \.j-rail-name,[\s\S]*?font-size: 0\.76rem !important;[\s\S]*?letter-spacing: 0\.02em !important/,
  'Ownership and Manifesto labels use the same type specimen as Inspire');
assert.match(css,
  /\.j-rail \.j-rail-slot\.j-rail-purpose-child \.j-rail-name \{[\s\S]*?color: var\(--parchment\);[\s\S]*?opacity: 1;/,
  'both child labels remain fully legible at rest before Ownership selection');
assert.match(finalWorldSource,
  /uNavPocketPx[\s\S]*?gl_FragCoord\.xy[\s\S]*?navPocketMask[\s\S]*?mix\(1\.0, navPocketMask, \$\{NAV_POCKET_STRENGTH_GLSL\}\)[\s\S]*?makeStrandMat/,
  'every Final bed-line material softly quiets strokes behind the shared subtree pocket');
assert.match(finalIndexSource,
  /amount: reach \* PURPOSE_NAV_POCKET_STRENGTH/,
  'the hero-ground pocket uses the same restrained strength as Final bed lines');
assert.match(canopySource,
  /uniforms\.uNavPocketPx\.value\.set\([\s\S]*?pocket\.x \* dpr/,
  'the shared Final line pocket follows responsive viewport and device pixel ratio');
assert.match(railSource,
  /--nav-scrim-extra'[\s\S]*?340 \* \(1 - gatherU\)[\s\S]*?--nav-scrim-height'[\s\S]*?260 - 20 \* gatherU/,
  'the broad row scrim gathers camera-synchronously to the compact Ownership subtree');
assert.match(css,
  /width: calc\(100% \+ var\(--nav-scrim-extra, 340px\)\);[\s\S]*?height: var\(--nav-scrim-height, 260px\);/,
  'the row scrim consumes the ownership-sized geometry with safe resting fallbacks');
assert.doesNotMatch(handoffCss, /background: radial-gradient|backdrop-filter/,
  'the subtree pocket cannot regress into a visible DOM scrim');
assert.match(css,
  /\.j-rail\.j-rail-purpose-labels-leaving \.j-rail-list > \.j-rail-slot[\s\S]*?opacity: var\(--purpose-label-fade, 0\) !important;[\s\S]*?\.j-rail:is\(\.j-rail-purpose-labels-above, \.j-rail-purpose-labels-gathering\)[\s\S]*?bottom: calc\(50% \+ var\(--item-d\) \/ 2 \+ 5px\);[\s\S]*?opacity: 0;/,
  'Purpose fades below-mark labels before seating their hover answer above each mark');
assert.match(css,
  /\.j-rail\.j-rail-purpose-labels-above \.j-rail-list > \.j-rail-slot[\s\S]*?> \.j-rail-item:is\(:hover, :focus-visible\) > \.j-rail-name[\s\S]*?opacity: 1;/,
  'top-row labels reveal individually for pointer and keyboard focus');
assert.match(railSource,
  /j-rail-purpose-arriving'[\s\S]*?!!ticket && selectedChapterId === 'final'/,
  'only an explicit in-flight Purpose arrival raises the transient label guard');
assert.match(css,
  /\.j-rail\.j-rail-purpose-arriving \.j-rail-list > \.j-rail-slot[\s\S]*?> \.j-rail-item > :is\(\.j-rail-name, \.j-rail-soon-note\)[\s\S]*?opacity: 0 !important;[\s\S]*?transition: none;/,
  'moving marks cannot turn an incidental pointer crossing into a Purpose hover label');
assert.match(css,
  /\.j-rail\.j-rail-wrap-progress \.j-rail-list > \.j-rail-slot[\s\S]*?> \.j-rail-item > :is\(\.j-rail-name, \.j-rail-soon-note\)[\s\S]*?opacity: 0 !important;/,
  'a cyclic bookend lap suppresses every intermediate top-row label seat');
assert.match(css,
  /\.j-rail\.j-rail-wrap-progress \.j-rail-list > \.j-rail-slot\.j-rail-major[\s\S]*?> \.j-rail-item > \.j-rail-name[\s\S]*?--wrap-core-label-u/,
  'only the hero core-three names may consume the camera-paced wrap label envelope');
assert.match(railSource,
  /const visNow = railWrap[\s\S]*?railWrapVisualChapter\(\{[\s\S]*?homeChapterId: chapterAt\(railWrap\.homeP\)\.id,[\s\S]*?targetChapterId: chapterAt\(railWrap\.targetP\)\.id/,
  'wrap visual staging derives from semantic endpoints rather than crossed route coordinates');
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
  /const manifestoItem = el\('button', 'j-rail-item j-rail-manifesto-item'\)[\s\S]*?aria-label', 'Open Manifesto'[\s\S]*?navigate\('manifesto'\)/,
  'Manifesto is a keyboard-operable branch action');
assert.match(railSource,
  /const manifestoBase = GLYPH_COLOURS\.future[\s\S]*?--glyph-r'[\s\S]*?--glyph-g'[\s\S]*?--glyph-b'[\s\S]*?--glyph-alpha'[\s\S]*?--glyph-glow'/,
  'Manifesto has explicit warm resting ink before hover');
assert.match(css,
  /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?j-rail-purpose-labels-above[\s\S]*?opacity: 0 !important;[\s\S]*?j-rail \.j-rail-purpose-manifesto \.j-rail-name[\s\S]*?opacity: 1 !important;/,
  'touch-only Purpose suppresses sticky top-row labels while Manifesto stays a named control');
assert.match(css,
  /@media \(hover: none\), \(pointer: coarse\)[\s\S]*?data-layout="mission"[\s\S]*?data-chapter="mission"[\s\S]*?\.j-rail-name[\s\S]*?opacity: 0 !important;/,
  'touch-only Intro cannot retain a synthetic hover label after arrival');
assert.match(railSource,
  /if \(chapterId === 'inspire'\)[\s\S]*?\['arca', 'tworp', 'artcompute'\]/,
  'the live Inspire menu reads Arca Gidan, 2RP, ArtCompute');
assert.match(railSource,
  /menuClose, 'pointerdown'[\s\S]*?e\.stopPropagation\(\)[\s\S]*?if \(e\.pointerType !== 'mouse'\) return;[\s\S]*?menuClose, 'click'[\s\S]*?e\.preventDefault\(\)[\s\S]*?e\.stopPropagation\(\)[\s\S]*?closeMenu/,
  'touch dismissal keeps the close control mounted through click and cannot fall through to the opener');
assert.match(railSource,
  /menuBtn, 'pointerdown'[\s\S]*?e\.stopPropagation\(\)[\s\S]*?if \(e\.pointerType !== 'mouse'\) return;[\s\S]*?menuBtn, 'click'[\s\S]*?e\.preventDefault\(\)[\s\S]*?e\.stopPropagation\(\)[\s\S]*?openMenu/,
  'touch opening likewise waits for click so the new close control cannot capture the same tap');
assert.match(css,
  /--connector-next-item-d: var\(--nav-major\)[\s\S]*?:nth-last-child\(2\)[\s\S]*?--connector-next-item-d: var\(--nav-minor\)[\s\S]*?left: var\(--connector-left,[\s\S]*?var\(--slot-ring-d\) \/ 2[\s\S]*?width: var\(--connector-width,[\s\S]*?var\(--connector-next-ring-d\) \/ 2/,
  'preboot connectors use the same current/next ring-edge geometry as rowFrame');
assert.match(railSource,
  /--purpose-scrim-u', navPoseU\.toFixed\(5\)[\s\S]*?--purpose-rail-lift', `\$\{\(L\.purposeLift \* navPoseU \+ openedLift\)\.toFixed\(3\)\}px`/,
  'Purpose publishes one continuous composition clock for scrim density and rail lift');
assert.match(css,
  /opacity: calc\(0\.72[\s\S]*?- 0\.16 \* var\(--purpose-scrim-u, 0\)\)[\s\S]*?transform: translate\(-50%,[\s\S]*?var\(--purpose-rail-lift, 0px\)[\s\S]*?rgba\(12, 8, 3, calc\(0\.7 - 0\.08 \* var\(--purpose-scrim-u, 0\)\)\)/,
  'Purpose scrim stays bottom-anchored and fades continuously as its raised tree forms');
assert.match(railSource, /id: 'manifesto'[\s\S]*?action: 'manifesto'/,
  'the site-map Manifesto item uses the same branch action');
assert.match(css,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.j-rail \.j-rail-list,[\s\S]*?\.j-rail \.j-rail-purpose-tree,[\s\S]*?\.j-rail \.j-rail-purpose-indicator,[\s\S]*?transition: none !important;/,
  'reduced motion switches the row, subtree and dedicated indicator instantly');

console.log('Purpose/Ownership subtree handoff: ok');
