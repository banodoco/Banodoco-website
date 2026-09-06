/** Mobile Final is lifted as one composition. CSS consumes the pixel value
 * for copy/navigation; the camera converts the same value into world units. */
export const PHONE_FINAL_COMPOSITION_LIFT_PX = 30;

/** The phone scene needs a stronger camera truck than its fixed overlays.
 * 72 CSS px is roughly 216 device pixels on a normal 3x iPhone screenshot. */
export const PHONE_FINAL_SCENE_LIFT_PX = 72;

/* The pocket affects luminous line fragments only, not the scene's colour.
 * Keep just 15% of a crossing stroke at its centre: a weaker absence left a
 * seeded floor line visibly running behind the Ownership/Manifesto fork.
 *
 * 0.68 -> 0.85 (2026-08-30). The earlier raise was made for exactly this
 * symptom and did not finish the job: with the fork's own core restored (see
 * purposeNavPocket below), 32% retention still left the field's arteries
 * legible straight through the connectors — measured on rendered 1440x900
 * frames, the geometry fix alone moved the lit-pixel count in the band under
 * the child rings by only 6.7%. The ladder was shot at 0.68 / 0.85 / 0.92
 * against the same frame: 0.92 is barely cleaner than 0.85 and starts to read
 * as a HOLE, because the strokes resume at full brightness across a visible
 * boundary. 0.85 is the last value where the field still reads continuous. */
export const PURPOSE_NAV_POCKET_STRENGTH = 0.85;

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
    /* THE POCKET USED TO STOP ABOVE THE THING IT IS FOR (2026-08-30, owner on
       a 14-inch laptop: the Ownership/Manifesto connectors do not read against
       the field behind them).

       The shader's absence is not flat — it is full strength only inside 0.68
       of the ellipse and ramps back to nothing by 1.08 (world.js STRAND_FRAG).
       So the number that matters is the CORE, not the outer extent. At the
       old 118/72 the core ran from 69 to 167 px above the frame's bottom edge,
       while the instrument it protects spans 64..180 and its two child labels
       sit at roughly 46..64 — the labels were outside the core AND outside the
       ellipse, and measured behind them the background was still at 99% of its
       brightness. That is the one place a crossing artery is guaranteed to
       cross a hairline, and it was the one place with no absence at all.

       This is NOT a medium-laptop correction, and it was worth measuring
       before assuming: the instrument's geometry is fixed-size and viewport-
       centred, and this ellipse was already viewport-independent across every
       laptop size, so the deficiency was identical at 1366, 1440, 1512, 1600
       and 1680. The 14-inch report is where a bright artery happened to land
       on the fork, not where the pocket was uniquely weak. A width-scoped fix
       would have put a cliff in a continuous field to answer one aspect.

       Lowering the centre and growing the half-height together buys the fork
       its core WITHOUT opening a dark window over the row: the outer top edge
       moves 13px (196 -> 208 above the bottom at 900 tall) while the core's
       lower reach goes 69 -> 25, and the row's own top is better covered than
       before, not worse.
       25 AND NOT 35 BECAUSE THE TABLET FORK SITS LOWER. The instrument's seat
       is `centreFromBottom + purposeLift`, which is 158 on desktop but 136 on
       a portrait tablet, so its labels reach ~9px further down the frame. The
       ellipse cannot read that seat — importing rail-geometry.js here would
       close a cycle, since that file already imports this one for the phone
       lift — so the reach is sized for the LOWEST of the three bands and the
       other two simply get more margin. Shot against y100/hh96 at 1440x900:
       indistinguishable on the desktop frame, which is what makes the extra
       coverage free. */
    y: Math.min(96, height * 0.135),
    /* 170 -> 205: the instrument spans 356px at every laptop size and the old
       ellipse spanned 340, so its two ends overhung the absence by 8px each —
       which is precisely where the near-vertical arteries beside the Purpose
       node were crossing. 205 leaves ~54px of margin each side and is still
       28% of a 1440 frame, so this stays an absence around an instrument and
       not the "broad dark navigation window" the note above refuses. The
       width * 0.35 branch is untouched and still governs every frame under
       586px, so the phone ellipse is the same width it was. */
    halfWidth: Math.min(205, width * 0.35),
    halfHeight: Math.min(104, height * 0.135),
  };
}

export function cameraWorldUnitsForPixels({ pixels, distance, fov, viewportHeight }) {
  if (!(viewportHeight > 0) || !(distance > 0)) return 0;
  const verticalSpan = 2 * distance * Math.tan((Number(fov) || 0) * Math.PI / 360);
  return Number(pixels) * verticalSpan / viewportHeight;
}
