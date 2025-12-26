// =============================================================================
// CONFIGURATION - Easy to tweak and extend
// =============================================================================

export const TIME_CONFIG = {
  startYear: 2025,
  endYear: 2055,
  autoAdvanceMs: 1200,
  resumeDelayMs: 500,
} as const;

export const TOTAL_MONTHS = (TIME_CONFIG.endYear - TIME_CONFIG.startYear + 1) * 12;

// Growth rates (annual) and starting values - the "soul" of the projection
export const GROWTH_CONFIG = {
  contributors: { base: 12, annualGrowth: 1.4 },
  tools: { base: 1, annualGrowth: 1.35 },
  artists: { base: 89, annualGrowth: 1.45 },
  consumers: { base: 1200, annualGrowth: 1.5 },
  // Dampen growth after year 20 to keep numbers realistic
  dampeningAfterYear: 20,
  dampeningFactor: 0.85,
} as const;

// Visual constants for the river visualization
export const COLORS = {
  contributors: '#3b82f6',
  tools: '#10b981',
  artists: '#f59e0b',
  consumers: '#f43f5e',
} as const;

// X-positions for each stage in the SVG (viewBox is 1400 wide)
export const STAGE_X = {
  start: 40,
  reigh: 240,
  tools: 440,
  artists: 760,
  consumers: 1300,
} as const;

export const SVG_CONFIG = {
  width: 1400,
  height: 500,
  centerY: 250,
} as const;

export const YEAR_MARKERS = [2025, 2030, 2035, 2040, 2045, 2050, 2055];

// =============================================================================
// TYPES
// =============================================================================

export interface Stats {
  contributors: number;
  tools: number;
  artists: number;
  consumers: number;
}

