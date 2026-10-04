import { blendEase } from '../camera-blend.js';

// Spend the camera ticket's clock, including its reverse gear. A replacement
// ticket starts from the identity already painted, so interruptions never snap.
export function createLogoMorph(element) {
  let value = 0;
  let ticket = null;
  let from = 0;
  let to = 0;
  const paint = () => element?.style.setProperty('--logo-away-u', String(value));
  paint();
  return {
    update(blend, away, dt) {
      // placeAt publishes synthetic frames before installing a new ticket.
      if (dt <= 0) return;
      if (blend) {
        if (ticket !== blend) {
          ticket = blend;
          from = value;
          to = away ? 1 : 0;
        }
        const f = Math.max(0, Math.min(1, blend.t / blend.dur));
        const ease = blendEase(f, blend.easeSlope || 0, blend.easeK || 4);
        value = Math.max(0, Math.min(1, from + (to - from) * ease));
      } else {
        ticket = null;
        value = away ? 1 : 0;
      }
      paint();
    },
  };
}
