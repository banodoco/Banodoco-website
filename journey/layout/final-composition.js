/** Mobile Final is lifted as one composition. CSS consumes the pixel value
 * for copy/navigation; the camera converts the same value into world units. */
export const PHONE_FINAL_COMPOSITION_LIFT_PX = 30;

/* The pocket affects luminous line fragments only, not the scene's colour.
 * Keep just 32% of a crossing stroke at its centre: a weaker absence left a
 * seeded floor line visibly running behind the Ownership/Manifesto fork. */
export const PURPOSE_NAV_POCKET_STRENGTH = 0.68;

/** Soft screen-space absence behind Purpose's compact navigator subtree.
 * Values are CSS pixels; shader callers multiply by DPR at the write edge.
 * The ellipse extends beyond the viewport bottom, so there is no visible
 * lower edge and no rectangular overlay around the instrument. */
export function purposeNavPocket({ width, height }) {
  return {
    /* The child fork is centred on the viewport axis. Keep this absence
       narrow and strong around that fork so the scene remains luminous above
       and below it instead of reading as a broad dark navigation window. */
    x: width * 0.5,
    y: Math.min(118, height * 0.16),
    halfWidth: Math.min(170, width * 0.35),
    halfHeight: Math.min(72, height * 0.10),
  };
}

export function cameraWorldUnitsForPixels({ pixels, distance, fov, viewportHeight }) {
  if (!(viewportHeight > 0) || !(distance > 0)) return 0;
  const verticalSpan = 2 * distance * Math.tan((Number(fov) || 0) * Math.PI / 360);
  return Number(pixels) * verticalSpan / viewportHeight;
}
