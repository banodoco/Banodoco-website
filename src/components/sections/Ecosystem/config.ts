// =============================================================================
// CONFIGURATION - Easy to tweak and extend
// =============================================================================

export const TIME_CONFIG = {
  startYear: 2025,
  endYear: 2095,
  autoAdvanceMs: 1200,
  resumeDelayMs: 500,
} as const;

export const TOTAL_MONTHS = (TIME_CONFIG.endYear - TIME_CONFIG.startYear + 1) * 12;

/**
 * Projection time-warp
 * --------------------
 * We keep the UI timeline as 2025 → 2095, but we "warp" the underlying projection
 * so growth accelerates early:
 * - By 2035, stats match what the old curve would have reached in 2075
 * - By 2095, stats still match the old 2095 (end) point
 *
 * This is implemented in `calculateStats()` by mapping the visible `monthIdx`
 * to a "projection monthIdx" using a piecewise-linear mapping.
 */
export const PROJECTION_TIME_WARP = {
  /** Visible year where the warp target should be hit */
  warpPeakVisibleYear: 2035,
  /** Old/projection year we want to hit at warpPeakVisibleYear */
  warpPeakProjectionYear: 2075,
} as const;

// Growth rates (annual) and starting values - the "soul" of the projection
// Tuned to reach ~5B fans by 2095
export const GROWTH_CONFIG = {
  contributors: { base: 12, annualGrowth: 1.24 },
  tools: { base: 1, annualGrowth: 1.21 },
  artists: { base: 1200, annualGrowth: 1.25 },
  fans: {
    base: 12000,
    annualGrowth: 1.285,
    /**
     * After the time-warp peak (2035 visible / 2075 projection), we apply a
     * higher annual growth so fans reach the desired 2095 target (~8.4B).
     *
     * Note: this is intentionally fans-only to keep the other metrics aligned
     * with the original 2095 targets.
     */
    lateAnnualGrowth: 1.358577697418808,
  },
  // Dampen growth after year 25 to keep numbers realistic
  // Factor tuned to reach ~5B fans by 2095 with the corrected dampening logic
  dampeningAfterYear: 25,
  dampeningFactor: 0.58,
} as const;

// Visual constants for the river visualization
export const COLORS = {
  contributors: '#3b82f6',
  tools: '#10b981',      // emerald/green (equip)
  artists: '#f59e0b',    // amber/orange (energise)
  fans: '#f43f5e',
} as const;

// X-positions for each stage in the SVG (viewBox is 1400 wide)
export const STAGE_X = {
  start: 40,
  reigh: 240,
  tools: 440,
  artists: 760,
  fans: 1300,
} as const;

export const SVG_CONFIG = {
  width: 1400,
  height: 500,
  centerY: 250,
} as const;

export const YEAR_MARKERS = [2025, 2035, 2045, 2055, 2065, 2075, 2085, 2095];

// =============================================================================
// TYPES
// =============================================================================

export interface Stats {
  contributors: number;
  tools: number;
  artists: number;
  fans: number;
}

