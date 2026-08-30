// journey-v6 — every tunable number the journey shares.
//
// F01 (2026-08-21): this file used to hold every constant directly; it is
// now a compatibility FACADE. The constants themselves live in domain
// modules under journey/constants/ (scroll, copy, camera, fog, hero) —
// grouped by which subsystem actually consumes them (see each module's own
// header). Every name this file exported before the split is re-exported
// here unchanged (same value, same type), so no importer needs to change.
//
// Nothing here is final. The scroll ranges, rest band, and threshold
// hysteresis are explicitly the numbers the grey-box prototype (P3) exists
// to settle; they live in domain files so tuning stays scoped, one diff, one
// review, per subsystem.
//
// Chapter ORDER is v6-canonical: Mission -> Inspire -> Connect -> Owned ->
// Final. Equip is deferred: it has no range, no route, no nav entry, and no
// scroll space (see adr-d2-harvest-map.md and adr-d6-routes.md).
//
// M4: the chapter table LIVES IN route.js — one ordered manifest that every
// global number (p-ranges, rest stops, snap anchors, nav entries, scroll
// allocations, seam positions) derives from. The domain modules keep only
// the feel/motion constants that are not per-chapter route data; the
// seam/fog and copy-band tables are computed against the manifest (in
// constants/fog.js and constants/copy.js respectively) so a re-timed route
// carries them along.

export {
  SNAP_ENGAGE_MS,
  ARRIVAL_HOLD_MS,
  SNAP_K,
  SNAP_BAND,
  SNAP_DEAD_P,
  WHEEL_LINE_PX,
  TOUCH_GAIN,
  KEY_STEP_PX,
  STALL_FRAME_MS,
  STALL_MAX_MS,
  COMMIT_BACK_CAP_VH,
  COMMIT_THRESHOLD,
  COMMIT_CARRY_RATE,
  COMMIT_CARRY_PEAK_VH,
  COMMIT_STREAM_GAP_MS,
  COMMIT_STREAM_MIN,
  COMMIT_GLIDE_PX,
  COMMIT_BLEND_K,
  MAX_SCRUB_RATE,
  COMMIT_CRUISE_MAX_PX,
  COMMIT_GLIDE_MAX_S,
  COMMIT_BRAKE_TAIL_S,
  SMOOTH_K,
} from './constants/scroll.js';

export {
  COPY_BANDS,
  COPY_FADE_P,
  COPY_OUT_K,
  COPY_IN_K,
  COPY_SETTLE_LO,
  COPY_SETTLE_HI,
  COPY_TRAVEL_LO,
  COPY_TRAVEL_HI,
  COPY_JUMP_LEAD,
  COPY_JUMP_TAIL_S,
  COPY_JUMP_COPY_TAIL_S,
  HOTSPOT_STAGGER_MS,
  HOTSPOT_IN_K,
  HOTSPOT_OUT_K,
  HOTSPOT_HOLD_HOME_K,
  HOTSPOT_DODGE_GAP,
  HOTSPOT_DODGE_MAX,
} from './constants/copy.js';

export {
  HANDHELD,
  ORBIT_BREATH,
  CONNECT_APPROACH_RAMP,
} from './constants/camera.js';

export {
  SEAM_FOG_DIPS,
  FOG_RAMP,
  THRESHOLD_HYSTERESIS_WORLD,
  THRESHOLD_HYSTERESIS_DEG,
  THRESHOLD_MIN_DWELL_MS,
} from './constants/fog.js';

export {
  HERO_INTRO_MS,
  DEEP_LINK_DETAIL_DELAY_MS,
} from './constants/hero.js';
