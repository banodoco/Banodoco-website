import { TIME_CONFIG, GROWTH_CONFIG, type Stats } from './config';

// =============================================================================
// DATE UTILITIES
// =============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const monthIndexToDate = (idx: number): { month: string; year: number } => ({
  month: MONTH_NAMES[idx % 12],
  year: TIME_CONFIG.startYear + Math.floor(idx / 12),
});

// =============================================================================
// STATS CALCULATION
// =============================================================================

export const calculateStats = (monthIdx: number): Stats => {
  const dampeningThresholdMonths = GROWTH_CONFIG.dampeningAfterYear * 12;
  
  // Calculate effective months: full growth up to threshold, then dampened growth after
  let effectiveMonths: number;
  if (monthIdx <= dampeningThresholdMonths) {
    effectiveMonths = monthIdx;
  } else {
    // Full growth for first 25 years, dampened growth for remaining months
    const monthsAfterThreshold = monthIdx - dampeningThresholdMonths;
    effectiveMonths = dampeningThresholdMonths + (monthsAfterThreshold * GROWTH_CONFIG.dampeningFactor);
  }

  const calc = (key: keyof typeof GROWTH_CONFIG) => {
    const config = GROWTH_CONFIG[key];
    if (typeof config !== 'object') return 0;
    const monthlyGrowth = Math.pow(config.annualGrowth, 1 / 12);
    return Math.round(config.base * Math.pow(monthlyGrowth, effectiveMonths));
  };

  return {
    contributors: calc('contributors'),
    tools: calc('tools'),
    artists: calc('artists'),
    fans: calc('fans'),
  };
};

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

// =============================================================================
// SVG PATH HELPERS
// =============================================================================

/** Generate a smooth bezier curve path */
export const curvePath = (x1: number, y1: number, x2: number, y2: number): string => {
  const midX = x1 + (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
};

/** Generate a filled ribbon shape between two points */
export const ribbonPath = (
  x1: number, y1Top: number, y1Bot: number,
  x2: number, y2Top: number, y2Bot: number
): string => {
  const midX = x1 + (x2 - x1) * 0.5;
  return `M ${x1} ${y1Top} 
    C ${midX} ${y1Top}, ${midX} ${y2Top}, ${x2} ${y2Top}
    L ${x2} ${y2Bot}
    C ${midX} ${y2Bot}, ${midX} ${y1Bot}, ${x1} ${y1Bot}
    Z`;
};

