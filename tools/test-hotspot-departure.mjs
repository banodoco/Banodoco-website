#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createHotspotFrame,
  hotspotDepartureOpacity,
  hotspotIconTabOpacity,
} from '../journey/ui/hotspot-frame.js';
import { createCopyArrival } from '../journey/ui/copy-arrival.js';
import { restProgress } from '../journey/route.js';

const ticket = {};
const marker = {
  chapter: 'inspire', iconTab: true, a: 1,
  departureTicket: null, departureA: 0, departureCopy: 0,
};

assert.equal(hotspotDepartureOpacity(marker, {
  currentChapterId: 'connect', railFlight: ticket, copyGate: 1,
}), 1, 'a settled outgoing marker starts at its painted opacity');
assert.equal(hotspotDepartureOpacity(marker, {
  currentChapterId: 'connect', railFlight: ticket, copyGate: 0.64,
}), 0.64, 'the outgoing marker follows the source copy fade exactly');
assert.equal(hotspotDepartureOpacity(marker, {
  currentChapterId: 'connect', railFlight: ticket, copyGate: 0,
}), 0, 'the marker and source copy complete their exit together');

const partialTicket = {};
const partial = {
  chapter: 'connect', iconTab: true, a: 0.42,
  departureTicket: null, departureA: 0, departureCopy: 0,
};
assert.equal(hotspotDepartureOpacity(partial, {
  currentChapterId: 'final', railFlight: partialTicket, copyGate: 0.7,
}), 0.42, 'interrupting an arrival cannot brighten its marker');
assert.equal(hotspotDepartureOpacity(partial, {
  currentChapterId: 'final', railFlight: partialTicket, copyGate: 0.35,
}), 0.21, 'a partial marker preserves its snapshot while fading proportionally');

assert.equal(hotspotDepartureOpacity(partial, {
  currentChapterId: 'connect', railFlight: partialTicket, copyGate: 0.35,
}), 0.21, 'an active carry remains owned by its original flight ticket');
assert.equal(hotspotDepartureOpacity(partial, {
  currentChapterId: 'connect', railFlight: null, copyGate: 1,
}), null, 'the carry retires with the flight');
assert.equal(partial.departureTicket, null);

const ordinary = {
  chapter: 'inspire', iconTab: false, a: 1,
  departureTicket: null, departureA: 0, departureCopy: 0,
};
assert.equal(hotspotDepartureOpacity(ordinary, {
  currentChapterId: 'connect', railFlight: {}, copyGate: 1,
}), null, 'non-initiative hotspot policies retain their existing departure');

const midDeparture = hotspotIconTabOpacity(0.5, true);
assert.deepEqual(midDeparture, { icon: 1, shell: 1, label: 1 },
  'a direct departure has one opacity authority: the source copy envelope');
assert.equal(0.5 * midDeparture.label, 0.5,
  'the initiative name remains exactly in step with the chapter copy fade');

const midArrival = hotspotIconTabOpacity(0.5, false);
assert.ok(midArrival.label > 0.35 && midArrival.label < midArrival.icon,
  'the name overlaps the icon formation without overtaking its short lead');
assert.ok(hotspotIconTabOpacity(0.2, false).label > 0,
  'the name no longer waits through nearly half of the formation before moving');

// Compose the real copy-flight owner with the real hotspot-frame painter.
// The scalar-only assertions above cannot catch a second opacity applied by
// the painter after the correct departure value has already been computed.
const mkStyle = () => {
  const values = new Map();
  return {
    opacity: '', visibility: 'hidden', pointerEvents: '',
    setProperty(key, value) { values.set(key, String(value)); },
    removeProperty(key) { values.delete(key); },
    getPropertyValue(key) { return values.get(key) || ''; },
  };
};
const mkClasses = () => {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    toggle(name, on) { if (on) values.add(name); else values.delete(name); },
    contains(name) { return values.has(name); },
  };
};
const fakeBlock = () => ({
  style: mkStyle(), classList: mkClasses(),
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0 }; },
});
const paintedButton = {
  style: mkStyle(), classList: mkClasses(), offsetWidth: 100, offsetHeight: 40,
  tabIndex: -1, setAttribute() {}, removeAttribute() {},
};
const paintedMarker = {
  id: 'arca', chapter: 'inspire', btn: paintedButton,
  world: () => ({ clone() { return this; } }), stagger: 0,
  a: 1, armAt: null, sup: false, iconTab: true, beatAt: 0, beatA: 1,
  radius: null, reveal: () => 0, revealDirect: true, revealScrub: false,
  departureTicket: null, departureA: 0, departureCopy: 0,
  revealBand: { lo: -1, hi: 0.338 }, hitEl: { style: mkStyle() },
  hitR: 0, padLast: 0, dotEl: {}, chipBare: false,
  holdAt: null, holdOff: null, pendX: 0, dodgeY: 0, dodgePrev: 0,
  hover: false, focused: false, armed: false, hot: false, pointer: null,
  label: 'Arca Gidan', labelEl: {}, preview: null, hotSeq: 0,
  labelOnHover: false, policyDone: true, placeable: true,
  layoutPlaceable: true, pillW: 100, pillH: 40, flipped: false,
  hitRaw: 0, sx: 500, sy: 400,
};
globalThis.window = { innerWidth: 1000, innerHeight: 800 };
const chapterIds = ['mission', 'inspire', 'connect', 'owned', 'final'];
const blocks = Object.fromEntries(chapterIds.map(id => [id, fakeBlock()]));
const copy = createCopyArrival({
  blocks, actionRows: {}, heroBlock: fakeBlock(),
  rail: { setHeroEase() {} }, reduceMotion: { matches: false },
});
copy.step({ chapterId: 'inspire', dt: 0, travelP: restProgress('inspire') });
const frame = createHotspotFrame({
  hotspots: [paintedMarker], blocks, sheetQuery: { matches: false },
});
const flight = {
  fromP: restProgress('inspire'), targetP: restProgress('connect'), phase: 0,
};
const geom = {
  viewDepth: () => 1, tanHalf: 1, project: () => ({ x: 0, y: 0, z: 0 }),
};
let sawReverseFormation = false;
for (const phase of [0, 0.08, 0.12, 0.16, 0.20, 0.24, 0.28, 0.32]) {
  flight.phase = phase;
  const travelP = flight.fromP + (flight.targetP - flight.fromP) * phase;
  copy.step({
    chapterId: 'connect', dt: phase ? 0.05 : 0, travelP, railFlight: flight,
  });
  frame.place({
    p: flight.targetP, dt: phase ? 0.05 : 0, detail: false,
    chapterId: 'connect', railFlight: flight, copyEase: copy.ease,
    excluded: new Set(), geom, now: phase * 1000,
  });
  const sourceCopy = copy.ease('inspire');
  const parentOpacity = Number(paintedButton.style.opacity);
  const labelOpacity = Number(
    paintedButton.style.getPropertyValue('--j-hot-label-in'));
  assert.ok(Math.abs(paintedMarker.a - sourceCopy) < 1e-9,
    `marker follows source copy at flight phase ${phase}`);
  assert.ok(Math.abs(parentOpacity * labelOpacity - sourceCopy) < 1e-9,
    `effective initiative-name opacity follows source copy at flight phase ${phase}`);
  assert.equal(paintedButton.style.pointerEvents, 'none',
    'an outgoing visual carry is not an interactive off-chapter control');
  if (phase === 0.28) {
    const shellScale = Number(
      paintedButton.style.getPropertyValue('--j-hot-shell-sx'));
    sawReverseFormation = shellScale > 0.24 && shellScale < 1;
  }
  assert.equal(paintedButton.classList.contains('vis'), sourceCopy > 0,
    `visibility retires only with source copy at flight phase ${phase}`);
}
assert.equal(sawReverseFormation, true,
  'the reverse shell formation has a visible intermediate state');

// Departure must keep following the camera even when its projected anchor
// crosses the source copy or the resting admission margin. Desktop and phone
// compositions cross these boundaries at different points in the flight.
for (const [width, height] of [[1440, 900], [390, 844]]) {
  window.innerWidth = width;
  window.innerHeight = height;
  const movingFlight = {};
  paintedMarker.a = 1;
  paintedMarker.departureTicket = null;
  blocks.inspire.style.visibility = 'visible';
  blocks.inspire.getBoundingClientRect = () => ({
    left: width * 0.45, right: width * 0.8, top: 0, bottom: height,
  });
  let previousTransform;
  for (const [x, y] of [[0, 0], [0.2, 0.1], [1.1, 0.25]]) {
    frame.place({
      p: flight.targetP, dt: 0.05, detail: false,
      chapterId: 'connect', railFlight: movingFlight, copyEase: () => 0.7,
      excluded: new Set(['arca']),
      geom: { ...geom, project: () => ({ x, y, z: 0 }) }, now: 1000,
    });
    assert.equal(paintedMarker.placeable, true,
      'outgoing labels continue projecting through copy, masks and screen edges');
    assert.equal(paintedMarker.sx, (x * 0.5 + 0.5) * width);
    assert.equal(paintedMarker.sy, (-y * 0.5 + 0.5) * height);
    assert.notEqual(paintedButton.style.transform, previousTransform,
      'the outgoing label moves with each camera projection');
    previousTransform = paintedButton.style.transform;
  }
  frame.place({
    p: flight.targetP, dt: 0.05, detail: false,
    chapterId: 'connect', railFlight: movingFlight, copyEase: () => 0.7,
    excluded: new Set(),
    geom: { ...geom, project: () => ({ x: 0, y: 0, z: 2 }) }, now: 1100,
  });
  assert.equal(paintedButton.classList.contains('vis'), false,
    'a label behind the camera cannot linger at its last screen position');
}

console.log('hotspot direct-departure copy sync and world motion: ok');
