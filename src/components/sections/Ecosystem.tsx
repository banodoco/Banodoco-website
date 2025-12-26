import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// CONFIGURATION - Easy to tweak and extend
// =============================================================================

const TIME_CONFIG = {
  startYear: 2025,
  endYear: 2055,
  autoAdvanceMs: 1200,
  resumeDelayMs: 500,
} as const;

const TOTAL_MONTHS = (TIME_CONFIG.endYear - TIME_CONFIG.startYear + 1) * 12;

// Growth rates (annual) and starting values - the "soul" of the projection
const GROWTH_CONFIG = {
  contributors: { base: 12, annualGrowth: 1.4 },
  tools: { base: 1, annualGrowth: 1.35 },
  artists: { base: 89, annualGrowth: 1.45 },
  consumers: { base: 1200, annualGrowth: 1.5 },
  // Dampen growth after year 20 to keep numbers realistic
  dampeningAfterYear: 20,
  dampeningFactor: 0.85,
} as const;

// Visual constants for the river visualization
const COLORS = {
  contributors: '#3b82f6',
  tools: '#10b981',
  artists: '#f59e0b',
  consumers: '#f43f5e',
} as const;

// X-positions for each stage in the SVG (viewBox is 1400 wide)
const STAGE_X = {
  start: 40,
  reigh: 240,
  tools: 440,
  artists: 760,
  consumers: 1300,
} as const;

const SVG_CONFIG = {
  width: 1400,
  height: 500,
  centerY: 250,
} as const;

// =============================================================================
// TYPES
// =============================================================================

type StageKey = keyof typeof COLORS;

interface Stats {
  contributors: number;
  tools: number;
  artists: number;
  consumers: number;
}

interface StageVisualConfig {
  spreadStart: number;
  spreadGrowth: number;
  lineCount: number | ((progress: number) => number);
  lineWidth: number | ((progress: number) => number);
  lineOpacity: number | ((progress: number) => number);
  ribbonOpacity: number | ((progress: number) => number);
}

// =============================================================================
// UTILITIES
// =============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthIndexToDate = (idx: number): { month: string; year: number } => ({
  month: MONTH_NAMES[idx % 12],
  year: TIME_CONFIG.startYear + Math.floor(idx / 12),
});

const calculateStats = (monthIdx: number): Stats => {
  const years = monthIdx / 12;
  const dampening = years > GROWTH_CONFIG.dampeningAfterYear ? GROWTH_CONFIG.dampeningFactor : 1;
  const effectiveMonths = monthIdx * dampening;

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
    consumers: calc('consumers'),
  };
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

// =============================================================================
// SVG HELPERS
// =============================================================================

/** Generate a smooth bezier curve path */
const curvePath = (x1: number, y1: number, x2: number, y2: number): string => {
  const midX = x1 + (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
};

/** Generate a filled ribbon shape between two points */
const ribbonPath = (
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

/** Resolve a value that can be static or progress-dependent */
const resolveValue = (value: number | ((p: number) => number), progress: number): number =>
  typeof value === 'function' ? value(progress) : value;

// =============================================================================
// RIVER VISUALIZATION
// =============================================================================

interface RiverVisualizationProps {
  progress: number;
  stats: Stats;
}

const RiverVisualization: React.FC<RiverVisualizationProps> = ({ progress, stats }) => {
  const { ribbons, lines, nodes } = useMemo(() => {
    const ribbons: JSX.Element[] = [];
    const lines: JSX.Element[] = [];
    const nodes: JSX.Element[] = [];
    const { centerY } = SVG_CONFIG;

    // Track endpoints for connecting stages
    let currentEndpoints: number[] = [centerY];

    // --- STAGE 1: Contributors flowing into Reigh ---
    const contribSpread = 10 + progress * 50;
    const contribCount = Math.max(3, Math.floor(3 + progress * 10));

    ribbons.push(
      <path
        key="ribbon-contributors"
        d={ribbonPath(
          STAGE_X.start, centerY - contribSpread / 2, centerY + contribSpread / 2,
          STAGE_X.reigh, centerY - 3, centerY + 3
        )}
        fill={COLORS.contributors}
        opacity={0.15 + progress * 0.1}
      />
    );

    for (let i = 0; i < contribCount; i++) {
      const t = contribCount > 1 ? i / (contribCount - 1) : 0.5;
      const yStart = centerY - contribSpread / 2 + t * contribSpread;
      lines.push(
        <path
          key={`contrib-line-${i}`}
          d={curvePath(STAGE_X.start, yStart, STAGE_X.reigh, centerY)}
          stroke={COLORS.contributors}
          strokeWidth={1.5 + progress * 0.5}
          opacity={0.5}
          fill="none"
        />
      );
    }

    // --- STAGE 2: Tools branching from Reigh ---
    const toolSpread = progress * 80;
    const toolCount = Math.max(1, Math.floor(1 + progress * 15));
    const toolEndpoints: number[] = [];

    ribbons.push(
      <path
        key="ribbon-tools"
        d={ribbonPath(
          STAGE_X.reigh, centerY - 3, centerY + 3,
          STAGE_X.tools, centerY - toolSpread / 2, centerY + toolSpread / 2
        )}
        fill={COLORS.tools}
        opacity={0.15 + progress * 0.1}
      />
    );

    for (let i = 0; i < toolCount; i++) {
      const t = toolCount > 1 ? i / (toolCount - 1) : 0.5;
      const yEnd = centerY + (toolCount > 1 ? -toolSpread / 2 + t * toolSpread : 0);
      toolEndpoints.push(yEnd);

      lines.push(
        <path
          key={`tool-line-${i}`}
          d={curvePath(STAGE_X.reigh, centerY, STAGE_X.tools, yEnd)}
          stroke={COLORS.tools}
          strokeWidth={Math.max(1, 3 - progress * 1.5)}
          opacity={0.6}
          fill="none"
        />
      );
    }

    // --- STAGE 3: Artists multiplying from Tools ---
    const artistSpread = toolSpread + 15 + progress * 100;
    const artistsPerTool = Math.max(1, Math.floor(1 + progress * 5));
    const artistEndpoints: number[] = [];

    ribbons.push(
      <path
        key="ribbon-artists"
        d={ribbonPath(
          STAGE_X.tools, centerY - toolSpread / 2, centerY + toolSpread / 2,
          STAGE_X.artists, centerY - artistSpread / 2, centerY + artistSpread / 2
        )}
        fill={COLORS.artists}
        opacity={0.1 + progress * 0.1}
      />
    );

    toolEndpoints.forEach((toolY, tIdx) => {
      const localSpread = 12 + progress * 35;

      for (let i = 0; i < artistsPerTool; i++) {
        const t = artistsPerTool > 1 ? i / (artistsPerTool - 1) : 0.5;
        const globalT = tIdx / Math.max(1, toolCount - 1);
        const globalY = centerY - artistSpread / 2 + globalT * artistSpread;
        const blend = 0.3 + progress * 0.7;
        const yEnd = toolY * (1 - blend) + globalY * blend + (t - 0.5) * localSpread;

        artistEndpoints.push(yEnd);

        lines.push(
          <path
            key={`artist-line-${tIdx}-${i}`}
            d={curvePath(STAGE_X.tools, toolY, STAGE_X.artists, yEnd)}
            stroke={COLORS.artists}
            strokeWidth={Math.max(0.5, 2 - progress * 1.2)}
            opacity={0.35}
            fill="none"
          />
        );
      }
    });

    // --- STAGE 4: Consumers exploding from Artists ---
    const consumerSpread = 35 + progress * 420;
    const artistMin = artistEndpoints.length > 0 ? Math.min(...artistEndpoints) : centerY - 20;
    const artistMax = artistEndpoints.length > 0 ? Math.max(...artistEndpoints) : centerY + 20;
    const consumerLineCount = Math.min(150, Math.floor(15 + progress * 220));

    ribbons.push(
      <path
        key="ribbon-consumers"
        d={ribbonPath(
          STAGE_X.artists, artistMin, artistMax,
          STAGE_X.consumers, centerY - consumerSpread / 2, centerY + consumerSpread / 2
        )}
        fill={COLORS.consumers}
        opacity={0.12 + progress * 0.22}
      />
    );

    for (let i = 0; i < consumerLineCount; i++) {
      const t = consumerLineCount > 1 ? i / (consumerLineCount - 1) : 0.5;
      const sourceIdx = Math.min(Math.floor(t * artistEndpoints.length), artistEndpoints.length - 1);
      const startY = artistEndpoints[sourceIdx] || centerY;
      const endY = centerY - consumerSpread / 2 + t * consumerSpread;

      lines.push(
        <path
          key={`consumer-line-${i}`}
          d={curvePath(STAGE_X.artists, startY, STAGE_X.consumers, endY)}
          stroke={COLORS.consumers}
          strokeWidth={0.7 + progress * 0.8}
          opacity={0.18 + progress * 0.18}
          fill="none"
        />
      );
    }

    // --- TRANSITION NODES ---
    nodes.push(
      <circle key="node-reigh" cx={STAGE_X.reigh} cy={centerY} r={14} fill={COLORS.tools} filter="url(#glow)" stroke="white" strokeWidth="2" />,
      <circle key="node-tools" cx={STAGE_X.tools} cy={centerY} r={8 + progress * 4} fill={COLORS.tools} filter="url(#glow)" stroke="white" strokeWidth="1.5" opacity={0.9} />,
      <circle key="node-artists" cx={STAGE_X.artists} cy={centerY} r={6 + progress * 6} fill={COLORS.artists} filter="url(#glow)" stroke="white" strokeWidth="1.5" opacity={0.9} />
    );

    return { ribbons, lines, nodes };
  }, [progress]);

  const { centerY } = SVG_CONFIG;

  return (
    <svg
      viewBox={`0 0 ${SVG_CONFIG.width} ${SVG_CONFIG.height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g>{ribbons}</g>
      <g>{lines}</g>
      <g>{nodes}</g>

      {/* Labels */}
      <g fontFamily="system-ui" fontWeight="500" fill="white">
        <text x={STAGE_X.start} y={centerY - 30 - progress * 30} fill={COLORS.contributors} fontSize="12" opacity={0.9}>
          Contributors
        </text>
        <text x={STAGE_X.start} y={centerY - 13 - progress * 30} fontSize="16" fontWeight="bold">
          {formatNumber(stats.contributors)}
        </text>

        <text x={STAGE_X.reigh} y={centerY + 40} textAnchor="middle" fontSize="13" opacity={0.7}>
          Reigh
        </text>

        <text x={STAGE_X.tools} y={centerY - 40 - progress * 40} fill={COLORS.tools} textAnchor="middle" fontSize="12" opacity={0.9}>
          Tools
        </text>
        <text x={STAGE_X.tools} y={centerY - 23 - progress * 40} fontSize="16" fontWeight="bold" textAnchor="middle">
          {formatNumber(stats.tools)}
        </text>

        <text x={STAGE_X.artists} y={centerY - 50 - progress * 60} fill={COLORS.artists} textAnchor="middle" fontSize="12" opacity={0.9}>
          Artists
        </text>
        <text x={STAGE_X.artists} y={centerY - 33 - progress * 60} fontSize="16" fontWeight="bold" textAnchor="middle">
          {formatNumber(stats.artists)}
        </text>

        <text x={STAGE_X.consumers} y={centerY - 55 - progress * 80} fill={COLORS.consumers} textAnchor="end" fontSize="12" opacity={0.9}>
          Consumers
        </text>
        <text x={STAGE_X.consumers} y={centerY - 35 - progress * 80} fontSize="22" fontWeight="bold" textAnchor="end">
          {formatNumber(stats.consumers)}
        </text>
      </g>
    </svg>
  );
};

// =============================================================================
// TIMELINE SCRUBBER
// =============================================================================

interface TimelineScrubberProps {
  monthIdx: number;
  onMonthChange: (idx: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const YEAR_MARKERS = [2025, 2030, 2035, 2040, 2045, 2050, 2055];

const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  monthIdx,
  onMonthChange,
  onDragStart,
  onDragEnd,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleInteraction = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const progress = x / rect.width;
    const newIdx = Math.round(progress * (TOTAL_MONTHS - 1));
    onMonthChange(Math.max(0, Math.min(TOTAL_MONTHS - 1, newIdx)));
  }, [onMonthChange]);

  const startDrag = useCallback((clientX: number) => {
    isDragging.current = true;
    onDragStart();
    handleInteraction(clientX);
  }, [handleInteraction, onDragStart]);

  const endDrag = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      onDragEnd();
    }
  }, [onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => startDrag(e.clientX), [startDrag]);
  const handleTouchStart = useCallback((e: React.TouchEvent) => startDrag(e.touches[0].clientX), [startDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) handleInteraction(e.clientX);
  }, [handleInteraction]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging.current) handleInteraction(e.touches[0].clientX);
  }, [handleInteraction]);

  useEffect(() => {
    const handleGlobalEnd = () => endDrag();
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [endDrag]);

  const progress = monthIdx / (TOTAL_MONTHS - 1);
  const { month, year } = monthIndexToDate(monthIdx);

  return (
    <div className="w-full">
      {/* Date display */}
      <div className="text-center leading-none mb-3">
        <div className="text-sm text-white/50 font-medium tracking-wider uppercase">{month}</div>
        <div className="text-4xl md:text-5xl font-light text-white tabular-nums">{year}</div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-8 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endDrag}
      >
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-white/10 rounded-full" />

        {/* Filled track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${COLORS.contributors} 0%, ${COLORS.tools} 25%, ${COLORS.artists} 60%, ${COLORS.consumers} 100%)`,
          }}
        />

        {/* Year markers */}
        {YEAR_MARKERS.map((y) => {
          const yearIdx = (y - TIME_CONFIG.startYear) * 12;
          const pos = (yearIdx / (TOTAL_MONTHS - 1)) * 100;
          const isPast = monthIdx >= yearIdx;
          return (
            <div
              key={y}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${pos}%` }}
            >
              <div className={cn('w-2 h-2 rounded-full', isPast ? 'bg-white' : 'bg-white/30')} />
              <span className={cn('text-xs mt-2 font-medium', isPast ? 'text-white/80' : 'text-white/30')}>
                {y}
              </span>
            </div>
          );
        })}

        {/* Draggable handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
          style={{ left: `${progress * 100}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400 to-rose-400" />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const Ecosystem: React.FC = () => {
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = calculateStats(monthIdx);
  const progress = monthIdx / (TOTAL_MONTHS - 1);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setMonthIdx((prev) => {
        // Stop at the end instead of looping
        if (prev >= TOTAL_MONTHS - 1) return prev;
        return prev + 1;
      });
    }, TIME_CONFIG.autoAdvanceMs);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Cleanup resume timeout on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const handleMonthChange = useCallback((idx: number) => {
    setMonthIdx(idx);
  }, []);

  const handleDragStart = useCallback(() => {
    // Clear any pending resume
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    setIsPaused(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    // Resume after delay
    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      resumeTimeoutRef.current = null;
    }, TIME_CONFIG.resumeDelayMs);
  }, []);

  return (
    <section className="h-screen snap-start bg-[#080a09] text-white relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-12 left-4 right-4 z-20 flex justify-center">
        <div className="w-full max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight leading-tight">
            We want to nurture an ecosystem of thousands of tools based on open technology
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto mt-2">
            We want to help open source AI technology make its way into the hands of everyone through consumer-facing tools built by the community.
          </p>
        </div>
      </div>

      {/* River visualization */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-8">
        <div className="w-full max-w-7xl px-4">
          <RiverVisualization progress={progress} stats={stats} />
        </div>
      </div>

      {/* Timeline */}
      <div className="absolute bottom-16 left-4 right-4 z-20 flex justify-center">
        <div className="w-full max-w-3xl bg-black/60 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
          <TimelineScrubber
            monthIdx={monthIdx}
            onMonthChange={handleMonthChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>
      </div>
    </section>
  );
};
