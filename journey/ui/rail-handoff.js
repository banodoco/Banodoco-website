/* Purpose owns one level of navigation below the five-item journey row.
   Semantic availability stays destination-led, while the picture is painted
   separately from the camera ticket's eased phase. Keeping those two jobs
   separate is important: a Purpose <-> Connect flight crosses Owned's route
   coordinate, but that numerical crossing is not an Ownership selection. */
export const RAIL_HANDOFF = Object.freeze({
  JOURNEY: 'journey',
  PURPOSE: 'purpose-tree',
  OWNERSHIP_TRANSIT: 'ownership-transit',
  OWNERSHIP: 'ownership-tree',
});

export function railHandoffState({
  selectedChapterId,
  cameraStateDisagree,
  flightFromId = null,
  flightTargetId = null,
}) {
  if (selectedChapterId === 'owned') {
    return cameraStateDisagree
      ? RAIL_HANDOFF.OWNERSHIP_TRANSIT
      : RAIL_HANDOFF.OWNERSHIP;
  }
  // Keep the tree mounted (but inert) while leaving Ownership. This is the
  // reverse half of the same camera-paced handoff, not an arrival-only fade.
  if (cameraStateDisagree
      && flightFromId === 'owned'
      && flightTargetId === selectedChapterId) {
    return RAIL_HANDOFF.OWNERSHIP_TRANSIT;
  }
  if (selectedChapterId === 'final' && !cameraStateDisagree) {
    return RAIL_HANDOFF.PURPOSE;
  }
  return RAIL_HANDOFF.JOURNEY;
}

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const OWNERSHIP_INDICATOR_OCCLUSION_FLOOR = 0.35;
const smooth01 = value => {
  const u = clamp01(value);
  return u * u * (3 - 2 * u);
};

/** The Ownership indicator is one physical point travelling behind the child
 * specimen. It dims only while entering the ring and crossing the icon/label,
 * never vanishes, then reappears after clearing the text. Because this is a
 * pure projection of path position, reversal retraces the exact same opacity
 * instead of starting a second animation clock. */
export function railOwnershipIndicatorVisibility({ diagonal = 0, vertical = 0 } = {}) {
  const d = clamp01(diagonal);
  const v = clamp01(vertical);
  if (v > 0) {
    const emergence = smooth01((v - 0.62) / 0.38);
    return OWNERSHIP_INDICATOR_OCCLUSION_FLOOR
      + (1 - OWNERSHIP_INDICATOR_OCCLUSION_FLOOR) * emergence;
  }
  const entry = smooth01((d - 0.72) / 0.28);
  return 1 - (1 - OWNERSHIP_INDICATOR_OCCLUSION_FLOOR) * entry;
}

export const PURPOSE_WRAP_APPROACH_START = 0.60;

/** Purpose's presence during the cyclic Mission/Final camera lap. The same
 * endpoint envelope is used in reverse, so every consumer (tree, lift and
 * content-scale docking) can follow one camera-owned coordinate. */
export function railPurposeWrapPresence({ targetChapterId = 'mission', phase }) {
  const p = clamp01(phase);
  const endpoint = value => clamp01(
    (value - PURPOSE_WRAP_APPROACH_START) / (1 - PURPOSE_WRAP_APPROACH_START),
  );
  return targetChapterId === 'final' || targetChapterId === 'owned'
    ? endpoint(p)
    : endpoint(1 - p);
}

/** The persistent navigation's hero-sized pose belongs to the whole cyclic
 * camera lap, rather than Purpose's deliberately late subtree reveal. Keep
 * this endpoint-oriented so a reversed lap retraces the same pixels. */
export function railWrapNavigationProgress({ targetChapterId = 'mission', phase }) {
  const p = clamp01(phase);
  return targetChapterId === 'final' || targetChapterId === 'owned' ? p : 1 - p;
}

/** Camera-ticket progress toward the requested cyclic endpoint. */
export function railHandoffWrapPhase({ targetChapterId = 'mission', phase }) {
  const presence = railPurposeWrapPresence({ targetChapterId, phase });
  return targetChapterId === 'final' || targetChapterId === 'owned'
    ? presence
    : 1 - presence;
}

/** A cyclic bookend lap has two semantic pictures and no intermediate
 * chapters. The camera may orbit past route coordinates that belong to other
 * sections, but navigation staging holds the source until the hidden midpoint
 * and then stages only the destination. */
export function railWrapVisualChapter({ homeChapterId, targetChapterId, phase }) {
  return clamp01(phase) < 0.5 ? homeChapterId : targetChapterId;
}

export const WRAP_CORE_LABEL_EDGE = 0.22;

/** Only the hero's core-three labels participate in a wrap. They fade away
 * near a Mission departure and return only on Mission's final approach;
 * Purpose's child labels keep using the tree envelope. Bookend names and Soon
 * never consume this value. */
export function railWrapCoreLabelPresence({ targetChapterId = 'mission', phase }) {
  const p = clamp01(phase);
  const smooth = value => {
    const x = clamp01(value);
    return x * x * (3 - 2 * x);
  };
  return targetChapterId === 'mission'
    ? smooth((p - (1 - WRAP_CORE_LABEL_EDGE)) / WRAP_CORE_LABEL_EDGE)
    : 1 - smooth(p / WRAP_CORE_LABEL_EDGE);
}

/* The row labels have two physical seats in Purpose: their normal seat below
   the marks, and the quiet hover-only seat above them. A class switch at the
   first non-zero tree frame used to move visible labels between those seats,
   which read as a jump on a direct click. This projector keeps them below
   while the tree is opening, switches seats only after they are fully faded,
   and delays the reverse switch until the tree is almost gone. Ownership's
   gather phase takes priority only after the above-seat transition is safe. */
export const PURPOSE_LABEL_TOP_AT = 0.84;
export function railPurposeLabelStage({ tree = 0, ownership = 0 } = {}) {
  const t = clamp01(tree);
  const o = clamp01(ownership);
  if (t <= 0.001) return 'below';
  if (t < PURPOSE_LABEL_TOP_AT) return 'leaving';
  if (o > 0.001) return 'gathering';
  return 'above';
}

/** Horizontal absorption into the already-centred list. Keeping this as a
 * pure projection makes the invariant explicit: symmetric slots stay
 * symmetric and every slot reaches the list centre at ownership = 1. */
export function railGatherX({ centre, width, phase }) {
  return (Number(width) / 2 - Number(centre)) * clamp01(phase);
}

export function railHandoffRest(chapterId) {
  return {
    tree: chapterId === 'final' || chapterId === 'owned' ? 1 : 0,
    ownership: chapterId === 'owned' ? 1 : 0,
  };
}

/** Project an interruptible visual handoff onto the camera's eased phase.
 * `from` is the pair actually painted when this ticket began, so reversing
 * or overtaking a flight continues from the current pixels without a reset. */
export function railHandoffVisual({ from, targetChapterId, phase }) {
  const start = {
    tree: clamp01(from?.tree),
    ownership: clamp01(from?.ownership),
  };
  const target = railHandoffRest(targetChapterId);
  const u = clamp01(phase);
  return {
    tree: start.tree + (target.tree - start.tree) * u,
    ownership: start.ownership + (target.ownership - start.ownership) * u,
  };
}

/** A cyclic first/last wrap is outside the authored chapter rail. It may
 * collapse a subtree already visible at its source, but it must never grow a
 * new Purpose/Ownership tree merely because its circular picture crosses a
 * chapter coordinate. The destination rest is applied after the wrap lands. */
export function railHandoffWrapVisual({ from, targetChapterId = 'mission', phase }) {
  return railHandoffVisual({
    from,
    targetChapterId,
    phase: railHandoffWrapPhase({ targetChapterId, phase }),
  });
}

export function applyRailHandoffState({
  root,
  journeySurface,
  treeSurface,
  purposeSurface,
  ownershipSurface,
}, state) {
  if (!Object.values(RAIL_HANDOFF).includes(state)) {
    throw new TypeError(`[rail-handoff] unknown state '${state}'`);
  }

  const showingTree = state !== RAIL_HANDOFF.JOURNEY;
  const settledOwnership = state === RAIL_HANDOFF.OWNERSHIP;
  const ownershipAvailable = state === RAIL_HANDOFF.PURPOSE;
  const purposeAvailable = false;

  root.dataset.handoff = state;
  for (const value of Object.values(RAIL_HANDOFF)) {
    root.classList.toggle(`j-rail-handoff-${value}`, value === state);
  }

  // The ordinary row remains the semantic surface at Ownership: its existing
  // Purpose link is the one parent that gathers to centre and returns out of
  // the subtree. The duplicate tree parent stays permanently unavailable.
  journeySurface.inert = false;
  journeySurface.setAttribute('aria-hidden', 'false');
  treeSurface.inert = !showingTree;
  treeSurface.setAttribute('aria-hidden', String(!showingTree));

  purposeSurface.inert = !purposeAvailable;
  purposeSurface.setAttribute('aria-hidden', String(!purposeAvailable));
  ownershipSurface.inert = !ownershipAvailable;
  ownershipSurface.setAttribute('aria-disabled', String(!ownershipAvailable));
  if (settledOwnership) ownershipSurface.setAttribute('aria-current', 'page');
  else ownershipSurface.removeAttribute('aria-current');
}
