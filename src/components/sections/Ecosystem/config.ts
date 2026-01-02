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

// Growth rates (annual) and starting values - the "soul" of the projection
// Tuned to reach ~5B fans by 2095
export const GROWTH_CONFIG = {
  contributors: { base: 12, annualGrowth: 1.24 },
  tools: { base: 1, annualGrowth: 1.21 },
  artists: { base: 1200, annualGrowth: 1.25 },
  fans: { base: 12000, annualGrowth: 1.285 },
  // Dampen growth after year 25 to keep numbers realistic
  // Factor tuned to reach ~5B fans by 2095 with the corrected dampening logic
  dampeningAfterYear: 25,
  dampeningFactor: 0.58,
} as const;

// Visual constants for the river visualization
export const COLORS = {
  contributors: '#3b82f6',
  tools: '#10b981',
  artists: '#f59e0b',
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

