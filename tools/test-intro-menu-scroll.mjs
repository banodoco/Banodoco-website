import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { claimInput, releaseInput, ownerOf, modalLive, targetOwnsKey } from '../journey/ownership.js';

// Execute the actual startup capture callback, using the real ownership
// registry. The menu becomes ready before this listener is removed.
const source = readFileSync(new URL('../journey/boot/handoff.js', import.meta.url), 'utf8');
const start = source.indexOf('  onIntroInput = (e) => {');
const end = source.indexOf('  introCaptureLive = true;', start);
assert.ok(start >= 0 && end > start);
let collected = 0;
const capture = new Function('ownerOf', 'modalLive', 'targetOwnsKey', 'collectBootInput',
  `let onIntroInput; ${source.slice(start, end)} return onIntroInput;`)(
  ownerOf, modalLive, targetOwnsKey, () => collected++);
const link = { tagName: 'A', nodeType: 1, getAttribute() { return null; } };
const menu = { isConnected: true, contains: node => node === link };
const background = { tagName: 'DIV', nodeType: 1, getAttribute() { return null; } };
globalThis.document = { activeElement: background, body: background };
function event(type, target, key) {
  return { type, target, key, touches: [{ clientY: 300 }], cancelable: true,
    defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
}
for (const type of ['wheel', 'touchmove', 'keydown']) {
  claimInput(menu, { modal: true });
  const inside = event(type, link, 'PageDown'); capture(inside);
  assert.equal(inside.defaultPrevented, false, `${type}: native menu scroll survives startup capture`);
  assert.equal(collected, 0, 'menu input never queues journey input');
  releaseInput(menu);
}
claimInput(menu, { modal: true });
const modalKey = event('keydown', background, 'PageDown'); capture(modalKey);
assert.equal(modalKey.defaultPrevented, false, 'modal keeps scrolling keys even if focus briefly outside');
releaseInput(menu);
for (const type of ['wheel', 'touchmove', 'keydown']) {
  const outside = event(type, background, 'PageDown'); capture(outside);
  assert.equal(outside.defaultPrevented, true, `${type}: background remains blocked`);
}
assert.equal(collected, 3);
console.log('Intro menu scroll: native wheel/touch/key ownership and background blocking passed');
