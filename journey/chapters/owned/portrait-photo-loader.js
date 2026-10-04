import { PORTRAIT_SPRITE } from '../../../assets/contributor-portraits/manifest.js';

/** Starts the single sprite request used by every photo atlas.
 *
 * The portrait set is an enhancement. A network request that never emits
 * either image event must not hold the whole journey's readiness promise. */
export function loadPortraitSprite(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('portrait sprite timed out'));
    }, timeoutMs);
    const finish = (fn) => (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    image.onload = finish(() => resolve({ sheet: image }));
    image.onerror = finish(() => reject(new Error('portrait sprite failed to load')));
    image.src = PORTRAIT_SPRITE.url;
  });
}
