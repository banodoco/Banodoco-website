import { el } from './dom.js';

/** Creates the card retarget announcement surface and owns its debounce timer. */
export function createLiveRegion() {
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
      timer = setTimeout(() => {
        element.textContent = message;
        timer = null;
      }, 60);
    },
  };
}
