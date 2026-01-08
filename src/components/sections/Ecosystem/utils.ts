import { TIME_CONFIG, GROWTH_CONFIG, PROJECTION_TIME_WARP, type Stats } from './config';

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
  /**
   * Map the visible timeline monthIdx (2025→2095) to a projection monthIdx.
   * This lets us accelerate early growth without changing the UI timeline.
   */
  const warpPeakVisibleMonths = (PROJECTION_TIME_WARP.warpPeakVisibleYear - TIME_CONFIG.startYear) * 12;
  const warpPeakProjectionMonths = (PROJECTION_TIME_WARP.warpPeakProjectionYear - TIME_CONFIG.startYear) * 12;
  const endProjectionMonths = (TIME_CONFIG.endYear - TIME_CONFIG.startYear) * 12;

  const projectionMonthIdx = (() => {
    // Clamp just in case callers overshoot.
    const clamped = Math.min(Math.max(monthIdx, 0), endProjectionMonths);
    if (warpPeakVisibleMonths <= 0) return clamped; // degenerate config

    if (clamped <= warpPeakVisibleMonths) {
      // Segment A: 2025 → warpPeakVisible maps to 2025 → warpPeakProjection
      const t = clamped / warpPeakVisibleMonths;
      return t * warpPeakProjectionMonths;
    }

    // Segment B: warpPeakVisible → 2095 maps to warpPeakProjection → 2095
    const remainingVisible = endProjectionMonths - warpPeakVisibleMonths;
    if (remainingVisible <= 0) return warpPeakProjectionMonths; // degenerate config

    const t = (clamped - warpPeakVisibleMonths) / remainingVisible;
    return warpPeakProjectionMonths + t * (endProjectionMonths - warpPeakProjectionMonths);
  })();

  const dampeningThresholdMonths = GROWTH_CONFIG.dampeningAfterYear * 12;
  
  // Calculate effective months: full growth up to threshold, then dampened growth after
  let effectiveMonths: number;
  if (projectionMonthIdx <= dampeningThresholdMonths) {
    effectiveMonths = projectionMonthIdx;
  } else {
    // Full growth for first 25 years, dampened growth for remaining months
    const monthsAfterThreshold = projectionMonthIdx - dampeningThresholdMonths;
    effectiveMonths =
      dampeningThresholdMonths + (monthsAfterThreshold * GROWTH_CONFIG.dampeningFactor);
  }

  /**
   * Calculate stats for a stage.
   * For fans we support an optional higher lateAnnualGrowth after the warp-peak projection point
   * (i.e. after the values match the old 2075 point).
   */
  const calc = (key: keyof typeof GROWTH_CONFIG) => {
    const config = GROWTH_CONFIG[key];
    if (typeof config !== 'object') return 0;

    // Fans-only late growth boost, expressed in the same "effectiveMonths" space.
    if (
      key === 'fans' &&
      'lateAnnualGrowth' in config &&
      typeof config.lateAnnualGrowth === 'number' &&
      config.lateAnnualGrowth > 0
    ) {
      const boostStartProjectionMonths = warpPeakProjectionMonths;

      // Translate boost start into effectiveMonths so the breakpoint respects dampening.
      const boostStartEffectiveMonths = (() => {
        if (boostStartProjectionMonths <= dampeningThresholdMonths) return boostStartProjectionMonths;
        const after = boostStartProjectionMonths - dampeningThresholdMonths;
        return dampeningThresholdMonths + after * GROWTH_CONFIG.dampeningFactor;
      })();

      const earlyEff = Math.min(effectiveMonths, boostStartEffectiveMonths);
      const lateEff = Math.max(0, effectiveMonths - boostStartEffectiveMonths);

      const earlyMonthlyGrowth = Math.pow(config.annualGrowth, 1 / 12);
      const lateMonthlyGrowth = Math.pow(config.lateAnnualGrowth, 1 / 12);

      const value =
        config.base *
        Math.pow(earlyMonthlyGrowth, earlyEff) *
        Math.pow(lateMonthlyGrowth, lateEff);

      return Math.round(value);
    }

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

