import { PORTRAIT_SPRITE } from '../../../assets/contributor-portraits/manifest.js';

/** Starts the single sprite request used by every photo atlas. */
export function loadPortraitSprite() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ sheet: image });
    image.onerror = () => reject(new Error('portrait sprite failed to load'));
    image.src = PORTRAIT_SPRITE.url;
  });
}
