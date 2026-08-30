// GENERATED FIXTURE — S02 (2026-08-21-elegance-run-01).
//
// This file was produced by IMPORTING journey/route.js, journey/symbols.js,
// journey/constants.js, journey/structure.js and journey/navigation.js and
// serializing exactly what they export/return TODAY — not hand-transcribed
// from reading source. Purpose: pin every exported constant's exact value and type in journey/constants.js so a later order that removes
// a competing/duplicate source of route, copy, symbol or constant data (the
// F-series) is caught immediately if it changes a value, rather than at a
// capture gate.
//
// TO REGENERATE DELIBERATELY (only when a value legitimately changed):
//   node docs/code-health/evidence/2026-08-21-elegance-run-01/s02/generate-snapshot.mjs
// Then record the before/after in the run ledger. See the re-baselining
// protocol in docs/code-health/evidence/2026-08-21-elegance-run-01/c01/
// limitations.md §10 (this fixture follows the same convention) and this
// generator's own header. Do NOT hand-edit the assertions below to make them
// pass — regenerate, or transcription error creeps back in.

import assert from 'node:assert/strict';
import * as CONSTANTS from '../../journey/constants.js';

// The export-name list itself is generated data (Object.keys() of the live
// module namespace at generation time), not a hand-copied list — so an added
// or removed export is caught by the length/membership check below, not just
// a value check on the names this generator already knew about.
const EXPECTED_EXPORT_NAMES = [
  "ARRIVAL_HOLD_MS",
  "COMMIT_BACK_CAP_VH",
  "COMMIT_BLEND_K",
  "COMMIT_BRAKE_TAIL_S",
  "COMMIT_CARRY_PEAK_VH",
  "COMMIT_CARRY_RATE",
  "COMMIT_CRUISE_MAX_PX",
  "COMMIT_GLIDE_MAX_S",
  "COMMIT_GLIDE_PX",
  "COMMIT_STREAM_GAP_MS",
  "COMMIT_STREAM_MIN",
  "COMMIT_THRESHOLD",
  "CONNECT_APPROACH_RAMP",
  "COPY_BANDS",
  "COPY_FADE_P",
  "COPY_IN_K",
  "COPY_JUMP_COPY_TAIL_S",
  "COPY_JUMP_LEAD",
  "COPY_JUMP_TAIL_S",
  "COPY_OUT_K",
  "COPY_SETTLE_HI",
  "COPY_SETTLE_LO",
  "COPY_TRAVEL_HI",
  "COPY_TRAVEL_LO",
  "DEEP_LINK_DETAIL_DELAY_MS",
  "FOG_RAMP",
  "HANDHELD",
  "HERO_INTRO_MS",
  "HOTSPOT_DODGE_GAP",
  "HOTSPOT_DODGE_MAX",
  "HOTSPOT_HOLD_HOME_K",
  "HOTSPOT_IN_K",
  "HOTSPOT_OUT_K",
  "HOTSPOT_STAGGER_MS",
  "KEY_STEP_PX",
  "MAX_SCRUB_RATE",
  "ORBIT_BREATH",
  "SEAM_FOG_DIPS",
  "SMOOTH_K",
  "SNAP_BAND",
  "SNAP_DEAD_P",
  "SNAP_ENGAGE_MS",
  "SNAP_K",
  "STALL_FRAME_MS",
  "STALL_MAX_MS",
  "THRESHOLD_HYSTERESIS_DEG",
  "THRESHOLD_HYSTERESIS_WORLD",
  "THRESHOLD_MIN_DWELL_MS",
  "TOUCH_GAIN",
  "WHEEL_LINE_PX"
];
assert.deepEqual(Object.keys(CONSTANTS).sort(), EXPECTED_EXPORT_NAMES,
  '[constants fixture] the set of exported constant names drifted (added/removed export)');

const EXPECTED_SCALARS = {
  "ARRIVAL_HOLD_MS": {
    "value": 90,
    "type": "number"
  },
  "COMMIT_BACK_CAP_VH": {
    "value": 0.9,
    "type": "number"
  },
  "COMMIT_BLEND_K": {
    "value": 6,
    "type": "number"
  },
  "COMMIT_BRAKE_TAIL_S": {
    "value": 0.35,
    "type": "number"
  },
  "COMMIT_CARRY_PEAK_VH": {
    "value": 1.17,
    "type": "number"
  },
  "COMMIT_CARRY_RATE": {
    "value": 0.02,
    "type": "number"
  },
  "COMMIT_CRUISE_MAX_PX": {
    "value": 2200,
    "type": "number"
  },
  "COMMIT_GLIDE_MAX_S": {
    "value": 7.5,
    "type": "number"
  },
  "COMMIT_GLIDE_PX": {
    "value": 1500,
    "type": "number"
  },
  "COMMIT_STREAM_GAP_MS": {
    "value": 45,
    "type": "number"
  },
  "COMMIT_STREAM_MIN": {
    "value": 4,
    "type": "number"
  },
  "COMMIT_THRESHOLD": {
    "value": 0.35,
    "type": "number"
  },
  "CONNECT_APPROACH_RAMP": {
    "value": 0.08,
    "type": "number"
  },
  "COPY_FADE_P": {
    "value": 0.02,
    "type": "number"
  },
  "COPY_IN_K": {
    "value": 2.4,
    "type": "number"
  },
  "COPY_JUMP_COPY_TAIL_S": {
    "value": 0.55,
    "type": "number"
  },
  "COPY_JUMP_LEAD": {
    "value": 0.55,
    "type": "number"
  },
  "COPY_JUMP_TAIL_S": {
    "value": 0.15,
    "type": "number"
  },
  "COPY_OUT_K": {
    "value": 7,
    "type": "number"
  },
  "COPY_SETTLE_HI": {
    "value": 0.062,
    "type": "number"
  },
  "COPY_SETTLE_LO": {
    "value": 0.012,
    "type": "number"
  },
  "COPY_TRAVEL_HI": {
    "value": 0.09,
    "type": "number"
  },
  "COPY_TRAVEL_LO": {
    "value": 0.03,
    "type": "number"
  },
  "DEEP_LINK_DETAIL_DELAY_MS": {
    "value": 600,
    "type": "number"
  },
  "HERO_INTRO_MS": {
    "value": 7600,
    "type": "number"
  },
  "HOTSPOT_DODGE_GAP": {
    "value": 4,
    "type": "number"
  },
  "HOTSPOT_DODGE_MAX": {
    "value": 26,
    "type": "number"
  },
  "HOTSPOT_HOLD_HOME_K": {
    "value": 6,
    "type": "number"
  },
  "HOTSPOT_IN_K": {
    "value": 3.2,
    "type": "number"
  },
  "HOTSPOT_OUT_K": {
    "value": 9,
    "type": "number"
  },
  "HOTSPOT_STAGGER_MS": {
    "value": 150,
    "type": "number"
  },
  "KEY_STEP_PX": {
    "value": 110,
    "type": "number"
  },
  "MAX_SCRUB_RATE": {
    "value": 0.45,
    "type": "number"
  },
  "SMOOTH_K": {
    "value": 6.5,
    "type": "number"
  },
  "SNAP_BAND": {
    "value": 0.3,
    "type": "number"
  },
  "SNAP_DEAD_P": {
    "value": 0.0015,
    "type": "number"
  },
  "SNAP_ENGAGE_MS": {
    "value": 160,
    "type": "number"
  },
  "SNAP_K": {
    "value": 3.4,
    "type": "number"
  },
  "STALL_FRAME_MS": {
    "value": 34,
    "type": "number"
  },
  "STALL_MAX_MS": {
    "value": 400,
    "type": "number"
  },
  "THRESHOLD_HYSTERESIS_DEG": {
    "value": 8,
    "type": "number"
  },
  "THRESHOLD_HYSTERESIS_WORLD": {
    "value": 0.15,
    "type": "number"
  },
  "THRESHOLD_MIN_DWELL_MS": {
    "value": 250,
    "type": "number"
  },
  "TOUCH_GAIN": {
    "value": 1.35,
    "type": "number"
  },
  "WHEEL_LINE_PX": {
    "value": 16,
    "type": "number"
  }
};
for (const [name, { value, type }] of Object.entries(EXPECTED_SCALARS)) {
  assert.equal(typeof CONSTANTS[name], type, `[constants fixture] ${name} changed TYPE`);
  assert.deepEqual(CONSTANTS[name], value, `[constants fixture] ${name} changed VALUE`);
}

assert.deepEqual(CONSTANTS.COPY_BANDS, {
  "mission": {
    "lo": -1,
    "hi": 0.042
  },
  "inspire": {
    "lo": 0.248,
    "hi": 0.338
  },
  "connect": {
    "lo": 0.509,
    "hi": 0.5810000000000001
  },
  "owned": {
    "lo": 0.716,
    "hi": 0.792
  },
  "final": {
    "lo": 0.959,
    "hi": 2
  }
}, '[constants fixture] COPY_BANDS drifted');
assert.deepEqual(CONSTANTS.HANDHELD, {
  "ampDeg": 0.34,
  "posAmp": 0.016,
  "restFadeP": 0.018,
  "scrubLo": 0.06,
  "scrubHi": 0.16
}, '[constants fixture] HANDHELD drifted');
assert.deepEqual(CONSTANTS.ORBIT_BREATH, {
  "amp": 0.01,
  "cycles": 1.7
}, '[constants fixture] ORBIT_BREATH drifted');
assert.deepEqual(CONSTANTS.SEAM_FOG_DIPS, [
  {
    "c": 0.436,
    "w": 0.035,
    "near": 0.26,
    "far": 0.34
  },
  {
    "c": 0.688,
    "w": 0.026,
    "near": 0.46,
    "far": 0.52
  }
], '[constants fixture] SEAM_FOG_DIPS drifted');
assert.deepEqual(CONSTANTS.FOG_RAMP, {
  "far": 62,
  "farFromP": 0.78,
  "farToP": 0.99,
  "near": 15,
  "nearFromP": 0.835,
  "nearToP": 1
}, '[constants fixture] FOG_RAMP drifted');

console.log('constants compat fixture: ok');
