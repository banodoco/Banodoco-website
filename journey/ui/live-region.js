import { el } from './dom.js';

/** Creates the card retarget announcement surface and owns its debounce timer.
 *
 *  THE DEBOUNCE GOES THROUGH THE OWNER TREE (order U06). It was a raw
 *  `setTimeout`, so a teardown while an announcement was in flight left a
 *  60 ms timer armed against a live region nobody would read — the second
 *  instance of the leak U06's gate found, after `sheet-gesture.js`'s four
 *  listeners. Both were invisible to `UIL-T1` because its surface named four
 *  files and neither was one of them.
 *
 *  `owner.timer` returns the same `setTimeout` id, and `clearTimeout` on it
 *  keeps working, so the debounce behaves identically on every path that does
 *  not tear the UI down.
 *
 *  @param {object} deps.owner  the UI root owner. */
export function createLiveRegion({ owner }) {
  const element = el('div', 'j-live');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  document.body.appendChild(element);
  let timer = null;

  return {
    element,
    announce(message) {
      if (timer) clearTimeout(timer);
      element.textContent = '';
      timer = owner.timer(() => {
        element.textContent = message;
        timer = null;
      }, 60);
    },
  };
}
