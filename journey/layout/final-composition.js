/** Mobile Final is lifted as one composition. CSS consumes the pixel value
 * for copy/navigation; the camera converts the same value into world units. */
export const PHONE_FINAL_COMPOSITION_LIFT_PX = 30;

/** Soft screen-space absence behind Purpose's compact navigator subtree.
 * Values are CSS pixels; shader callers multiply by DPR at the write edge.
 * The ellipse extends beyond the viewport bottom, so there is no visible
 * lower edge and no rectangular overlay around the instrument. */
export function purposeNavPocket({ width, height }) {
  return {
    x: width * 0.5,
    y: Math.min(104, height * 0.12),
    halfWidth: Math.min(250, width * 0.44),
    halfHeight: Math.min(134, height * 0.16),
  };
}

export function cameraWorldUnitsForPixels({ pixels, distance, fov, viewportHeight }) {
  if (!(viewportHeight > 0) || !(distance > 0)) return 0;
  const verticalSpan = 2 * distance * Math.tan((Number(fov) || 0) * Math.PI / 360);
  return Number(pixels) * verticalSpan / viewportHeight;
}
