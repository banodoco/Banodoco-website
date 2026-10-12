import { blendEase, blendPhase } from '../camera-blend.js';

// Spend the camera ticket's clock, including its reverse gear. A replacement
// ticket starts from the identity already painted, so interruptions never snap.
export function createLogoMorph(element) {
  let value = 0;
  let ticket = null;
  let from = 0;
  let to = 0;
  let reading = 0;
  let readingFrom = 0;
  let readingTo = 0;
  let passagePhase = 0;
  const paint = () => {
    element?.style.setProperty('--logo-away-u', String(value));
    element?.style.setProperty('--logo-reading-u', String(reading));
  };
  paint();
  return {
    update(blend, away, dt, passage = null) {
      // placeAt publishes synthetic frames before installing a new ticket.
      if (dt <= 0) return;
      if (passage) {
        // Manifesto shares the camera/rail passage clock, including a return
        // interrupted before the wordmark has finished emerging.
        const phase = Math.max(0, Math.min(1, passage.phase));
        if (ticket !== passage.key || phase < passagePhase) {
          ticket = passage.key;
          from = value;
          to = passage.away ? 1 : 0;
          readingFrom = reading;
          readingTo = passage.reading ? 1 : 0;
        }
        passagePhase = phase;
        value = from + (to - from) * phase;
        reading = readingFrom + (readingTo - readingFrom) * phase;
      } else if (blend) {
        reading = 0;
        if (ticket !== blend) {
          ticket = blend;
          from = value;
          to = away ? 1 : 0;
        }
        const f = Math.max(0, Math.min(1, blend.t / blend.dur));
        const ease = blend.routeFaithful ? blendPhase(blend, f)
          : blendEase(f, blend.easeSlope || 0, blend.easeK || 4);
        value = Math.max(0, Math.min(1, from + (to - from) * ease));
      } else {
        ticket = null;
        value = away ? 1 : 0;
        reading = 0;
      }
      paint();
    },
  };
}
