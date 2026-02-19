
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ModelTrend } from '../types';

interface ModelTrendsProps {
  data: ModelTrend[];
}

// ============ Constants ============

// Order matters for stacked areas - bottom to top
const MODEL_COLORS: Record<string, { stroke: string; name: string }> = {
  sd: { stroke: 'var(--wrapped-model-sd)', name: 'Stable Diffusion' },
  animatediff: { stroke: 'var(--wrapped-model-animatediff)', name: 'AnimateDiff' },
  flux: { stroke: 'var(--wrapped-model-flux)', name: 'Flux' },
  wan: { stroke: 'var(--wrapped-model-wan)', name: 'Wan' },
  cogvideo: { stroke: 'var(--wrapped-model-cogvideo)', name: 'CogVideoX' },
  hunyuan: { stroke: 'var(--wrapped-model-hunyuan)', name: 'HunyuanVideo' },
  ltx: { stroke: 'var(--wrapped-model-ltx)', name: 'LTX' },
};

const MODEL_KEYS = Object.keys(MODEL_COLORS);

const ANIMATION = {
  MIN_STEP_MS: 120,
  MAX_STEP_MS: 400,
  AUTO_PLAY_DELAY_MS: 100,
  VISIBILITY_THRESHOLD: 0.3,
  LABEL_DURATION_FRAMES: 15,
} as const;

const CHART_COLORS = {
  tooltipBackground: 'var(--wrapped-chart-surface)',
  axisAndTicks: 'var(--wrapped-chart-axis)',
  grid: 'var(--wrapped-chart-grid)',
} as const;

// ============ Utilities ============

/** Normalize data so each point sums to exactly 100% */
function normalizeData(data: ModelTrend[]): ModelTrend[] {
  return data.map((point) => {
    const total = MODEL_KEYS.reduce((sum, key) => sum + (point[key as keyof ModelTrend] as number || 0), 0);
    if (total === 0 || Math.abs(total - 100) < 0.01) return point;

    const normalized: Record<string, string | number> = { ...point };
    MODEL_KEYS.forEach((key) => {
      normalized[key] = ((point[key as keyof ModelTrend] as number) || 0) * (100 / total);
    });
    return normalized as unknown as ModelTrend;
  });
}

/** Ease-out cubic: starts fast, slows at end */
function getStepDuration(progress: number): number {
  const eased = 1 - Math.pow(1 - progress, 3);
  return ANIMATION.MIN_STEP_MS + eased * (ANIMATION.MAX_STEP_MS - ANIMATION.MIN_STEP_MS);
}

/** Find the first frame where each model has a non-zero value */
function findModelFirstAppearances(data: ModelTrend[]): Record<string, number> {
  const appearances: Record<string, number> = {};

  data.forEach((point, frameIndex) => {
    MODEL_KEYS.forEach((key) => {
      if (appearances[key] === undefined) {
        const value = point[key as keyof ModelTrend] as number;
        if (value > 0) {
          appearances[key] = frameIndex;
        }
      }
    });
  });

  return appearances;
}

/** Format "YYYY-MM" to "Mon YYYY" */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Calculate which tick indices to show (max 6, always include last) */
function getVisibleTickIndices(totalCount: number, maxTicks: number = 6): Set<number> {
  if (totalCount <= maxTicks) {
    return new Set(Array.from({ length: totalCount }, (_, i) => i));
  }

  const indices = new Set<number>();
  const lastIndex = totalCount - 1;

  // Always include first and last
  indices.add(0);
  indices.add(lastIndex);

  // Distribute remaining ticks evenly
  const remainingTicks = maxTicks - 2;
  const step = lastIndex / (remainingTicks + 1);

  for (let i = 1; i <= remainingTicks; i++) {
    indices.add(Math.round(step * i));
  }

  return indices;
}



// ============ Hooks ============

type AnimationState = 'idle' | 'playing' | 'completed';

function useTimelineAnimation(totalFrames: number) {
  const [frame, setFrame] = useState(0);
  const [state, setState] = useState<AnimationState>('idle');
  const frameRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const play = useCallback(() => {
    frameRef.current = 0;
    setFrame(0);
    setState('playing');
  }, []);

  const pause = useCallback(() => {
    setState('idle');
  }, []);

  const toggle = useCallback(() => {
    if (state === 'playing') {
      pause();
    } else {
      play();
    }
  }, [state, play, pause]);

  useEffect(() => {
    if (state !== 'playing') return;

    let lastTime = 0;

    const tick = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;
      const stepDuration = getStepDuration(frameRef.current / totalFrames);

      if (elapsed >= stepDuration) {
        lastTime = timestamp;
        frameRef.current += 1;

        if (frameRef.current > totalFrames) {
          setState('completed');
          return;
        }

        setFrame(frameRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, totalFrames]);

  return { frame, state, play, pause, toggle };
}

function useAutoPlayOnVisible(
  ref: React.RefObject<HTMLElement | null>,
  onVisible: () => void
) {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= ANIMATION.VISIBILITY_THRESHOLD) {
          hasTriggered.current = true;
          observer.disconnect();
          setTimeout(onVisible, ANIMATION.AUTO_PLAY_DELAY_MS);
        }
      },
      { threshold: ANIMATION.VISIBILITY_THRESHOLD }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, onVisible]);
}

// ============ Components ============

interface TooltipEntry {
  value: number;
  name: string;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div
      className="border border-white/10 px-4 py-3 rounded-xl shadow-2xl min-w-[140px]"
      style={{ backgroundColor: CHART_COLORS.tooltipBackground }}
    >
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      {sorted.map((entry, i: number) => (
        entry.value > 0 && (
          <div key={i} className="flex items-center justify-between gap-4 text-xs py-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300">{entry.name}</span>
            </div>
            <span className="text-white font-bold">{Number(entry.value).toFixed(1)}%</span>
          </div>
        )
      ))}
    </div>
  );
};

/** Individual legend item with entrance animation */
const LegendItem: React.FC<{
  modelKey: string;
  stroke: string;
  name: string;
}> = ({ modelKey, stroke, name }) => {
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsNew(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      key={modelKey}
      layout
      initial={{ opacity: 0, x: 30, scale: 0.5 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: [0.5, 1.2, 1],
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        scale: { duration: 0.4, times: [0, 0.6, 1] }
      }}
      className="relative flex items-center gap-1.5 px-2 py-1"
    >
      {/* Glow effect on entrance */}
      {isNew && (
        <motion.div
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 rounded-lg"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${stroke} 25%, transparent) 0%, transparent 70%)`,
          }}
        />
      )}
      <motion.div
        className="w-3 h-3 rounded-sm relative z-10"
        style={{ backgroundColor: stroke }}
        animate={isNew ? {
          boxShadow: [
            `0 0 12px 4px color-mix(in srgb, ${stroke} 50%, transparent)`,
            '0 0 0px 0px transparent'
          ]
        } : {}}
        transition={{ duration: 0.5 }}
      />
      <span className="text-xs text-gray-300 whitespace-nowrap relative z-10">{name}</span>
    </motion.div>
  );
};

/** Custom animated legend that shows models in order of appearance */
const AnimatedLegend: React.FC<{
  visibleModels: Set<string>;
  firstAppearances: Record<string, number>;
}> = ({ visibleModels, firstAppearances }) => {
  // Sort models by appearance frame, then filter to only visible ones
  const sortedVisibleModels = Object.entries(MODEL_COLORS)
    .filter(([key]) => visibleModels.has(key))
    .sort((a, b) => (firstAppearances[a[0]] ?? 0) - (firstAppearances[b[0]] ?? 0));

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 sm:gap-x-3 px-2 sm:px-4 min-h-[32px]">
      <AnimatePresence mode="popLayout">
        {sortedVisibleModels.map(([key, { stroke, name }]) => (
          <LegendItem key={key} modelKey={key} stroke={stroke} name={name} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============ Main Component ============

const ModelTrends: React.FC<ModelTrendsProps> = ({ data }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const normalizedData = useMemo(() => normalizeData(data), [data]);
  const totalFrames = normalizedData.length;

  const { frame, state, play, toggle } = useTimelineAnimation(totalFrames);

  useAutoPlayOnVisible(sectionRef, play);

  // Find when each model first appears
  const firstAppearances = useMemo(
    () => findModelFirstAppearances(normalizedData),
    [normalizedData]
  );

  // Determine which models have appeared so far (for legend visibility)
  const visibleModels = useMemo(() => {
    const visible = new Set<string>();
    MODEL_KEYS.forEach((key) => {
      const appearFrame = firstAppearances[key];
      if (appearFrame !== undefined && frame > appearFrame) {
        visible.add(key);
      }
    });
    return visible;
  }, [frame, firstAppearances]);

  // Show all months but with zeroed values for unrevealed ones (keeps X-axis stable)
  const displayData = useMemo(() => {
    return normalizedData.map((point, index) => {
      if (index < frame) {
        return point; // Revealed month - show actual data
      }
      // Unrevealed month - zero all values
      const zeroed = { ...point };
      MODEL_KEYS.forEach((key) => {
        (zeroed as Record<string, unknown>)[key] = 0;
      });
      return zeroed;
    });
  }, [normalizedData, frame]);

  const currentMonth = frame > 0 ? normalizedData[frame - 1]?.month : '';
  const progress = totalFrames > 0 ? (frame / totalFrames) * 100 : 0;
  const isAnimating = state === 'playing' || (frame > 0 && frame < totalFrames);

  // Calculate which X-axis ticks to show (max 6, always include last)
  const visibleTickIndices = useMemo(
    () => getVisibleTickIndices(displayData.length, 6),
    [displayData.length]
  );

  return (
    <section ref={sectionRef}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-4 sm:mb-6"
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
          <span className="text-cyan-500">🤖</span> We've Seen Models Come and Go
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm">Share of conversation by model family — watching the community shift as new technology emerged.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="h-[280px] sm:h-[350px] lg:h-[400px] w-full bg-[#1a1a1a]/50 p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-white/5 backdrop-blur-sm shadow-2xl overflow-hidden relative"
      >
        {/* Play / Pause overlay */}
        <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 sm:left-5 sm:right-5 z-10 flex items-center justify-between" style={{ top: '28px' }}>
          {currentMonth ? (
            <div className="flex flex-col items-start bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Until</span>
              <span className="text-cyan-400 text-xs sm:text-sm font-mono tabular-nums">
                {formatMonth(currentMonth)}
              </span>
            </div>
          ) : <span />}
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-500/50 transition-all backdrop-blur-sm shadow-lg shadow-cyan-500/5"
          >
            {state === 'playing' ? '⏸ Pause' : state === 'completed' ? '▶ Replay' : '▶ Play'}
          </button>
        </div>

        {/* Progress bar during playback */}
        {isAnimating && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 z-10">
            <div
              className="h-full bg-cyan-500/60 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart
            data={displayData}
            margin={{ top: 45, right: 35, left: 5, bottom: -10 }}
            style={{ transition: 'all 150ms ease-out' }}
          >
            <defs>
              {Object.entries(MODEL_COLORS).map(([key, { stroke }]) => (
                <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stroke} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={stroke} stopOpacity={0.05}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="month"
              stroke={CHART_COLORS.axisAndTicks}
              axisLine={false}
              tickLine={false}
              dy={10}
              tick={(props: { x?: string | number; y?: string | number; payload?: { value: string }; index?: number }) => {
                const { x, y, payload, index } = props;
                if (index === undefined || !visibleTickIndices.has(index)) return null;
                return (
                  <text
                    x={x}
                    y={Number(y) + 10}
                    textAnchor="middle"
                    fill={CHART_COLORS.axisAndTicks}
                    fontSize={10}
                  >
                    {formatMonth(payload?.value ?? '')}
                  </text>
                );
              }}
              interval={0}
            />
            <YAxis
              stroke={CHART_COLORS.axisAndTicks}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={40}
              domain={[0, 100]}
              allowDataOverflow={false}
              scale="linear"
              tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} />
            {Object.entries(MODEL_COLORS).map(([key, { stroke, name }]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={stroke}
                fillOpacity={1}
                fill={`url(#color-${key})`}
                stackId="1"
                name={name}
                isAnimationActive={true}
                animationDuration={350}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Legend below chart - two rows on mobile */}
      <div className="mt-3 sm:mt-4">
        <AnimatedLegend visibleModels={visibleModels} firstAppearances={firstAppearances} />
      </div>
    </section>
  );
};

export default ModelTrends;
