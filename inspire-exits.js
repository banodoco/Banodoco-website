/** Inspire's shared initiative-to-geometry contract.
 *
 * This module is deliberately neutral: both the organism's wind filaments and
 * the Inspire chapter consume it, so neither layer duplicates the azimuths or
 * assigns project identity by an anonymous array position. Registration/tab
 * order remains a separate editorial concern in journey/structure.js. */
export const EXIT_SLOT = Object.freeze({ CENTER: 0, LEFT: 1, RIGHT: 2 });

// Authored by identity, not by display order or array position. `EXITS` below
// is assembled from each entry's explicit physical slot, so reordering these
// declarations cannot silently move an initiative to another plume.
const EXIT_BY_ID = Object.freeze({
  tworp: Object.freeze({ id: 'tworp', slot: EXIT_SLOT.CENTER, az: 5.83,
    riseMin: 1.55, riseMax: 2.35, lean: 0.52, tone: 0.66, knot: 0.58 }),
  arca: Object.freeze({ id: 'arca', slot: EXIT_SLOT.LEFT, az: 6.98,
    riseMin: 1.13, riseMax: 1.32, lean: 0.42, tone: 0.6, knot: 0.95 }),
  artcompute: Object.freeze({ id: 'artcompute', slot: EXIT_SLOT.RIGHT, az: 4.68,
    riseMin: 1.87, riseMax: 2.10, lean: 0.38, tone: 0.74, knot: 1.0 }),
});

const exitsBySlot = new Array(Object.keys(EXIT_SLOT).length);
for (const exit of Object.values(EXIT_BY_ID)) {
  if (exitsBySlot[exit.slot]) throw new Error(`Duplicate Inspire exit slot: ${exit.slot}`);
  exitsBySlot[exit.slot] = exit;
}
if (exitsBySlot.some((exit) => !exit)) throw new Error('Incomplete Inspire exit slots');
export const EXITS = Object.freeze(exitsBySlot);

/** Canonical node id -> physical geometry slot. Legacy `2rp` route input is
 * normalized by journey/structure.js before it reaches either consumer. */
export function exitIndexOf(id) {
  return Object.prototype.hasOwnProperty.call(EXIT_BY_ID, id) ? EXIT_BY_ID[id].slot : -1;
}
