
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';
import type { Milestone, CumulativeDataPoint } from '../types';
import confetti from 'canvas-confetti';

interface TimelineProps {
  milestones: Milestone[];
  cumulativeMessages: CumulativeDataPoint[];
}

const formatYAxis = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const isNearMillion = value >= 950000;

  if (isNearMillion) {
    // Gold tooltip for 1M area
    return (
      <div className="px-4 py-3 rounded-xl shadow-2xl border bg-gradient-to-br from-yellow-900/90 to-amber-900/90 border-yellow-500/50">
        <p className="text-sm font-bold text-yellow-300 mb-1">🎉 We hit 1 million posts!</p>
        <p className="text-xs text-yellow-100/70">{new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 rounded-xl shadow-2xl border bg-[#1a1a1a] border-white/10">
      <p className="text-xs text-gray-400 mb-1">{formatDate(label)}</p>
      <p className="text-sm font-bold text-white">{value.toLocaleString()} posts</p>
    </div>
  );
};

// Clean Y-axis ticks
const Y_TICKS = [0, 200000, 400000, 600000, 800000, 1000000];

const ANIMATION_DURATION = 2.5; // seconds

const Timeline: React.FC<TimelineProps> = ({ cumulativeMessages }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(chartRef, { once: true, amount: 0.2 });
  const [animationComplete, setAnimationComplete] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Find the 1M milestone point and its position as percentage of chart width
  const { millionPoint, millionPct, cappedData } = useMemo(() => {
    // Find the data point closest to 1M
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < cumulativeMessages.length; i++) {
      const dist = Math.abs(cumulativeMessages[i].cumulative - 1000000);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    // Calculate percentage position (where in the data array is the 1M point)
    const pct = ((closestIdx + 1) / cumulativeMessages.length) * 100;
    // Cap data at 1M so line doesn't go over
    const capped = cumulativeMessages.map(d => ({
      ...d,
      cumulative: Math.min(d.cumulative, 1000000)
    }));
    return {
      millionPoint: cumulativeMessages[closestIdx],
      millionPct: pct,
      cappedData: capped,
    };
  }, [cumulativeMessages]);

  // Start animation timer when in view
  useEffect(() => {
    if (isInView && !animationComplete) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, ANIMATION_DURATION * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, animationComplete]);

  // Trigger celebration when animation completes - sparkles from the gold marker
  useEffect(() => {
    if (animationComplete && !hasCelebrated && chartRef.current) {
      setHasCelebrated(true);

      // Get chart position to calculate sparkle origin
      const rect = chartRef.current.getBoundingClientRect();
      const originX = (rect.right - 40) / window.innerWidth; // Near right edge of chart
      const originY = (rect.top + 60) / window.innerHeight; // Near top of chart (where 1M is)

      // Single sparkle burst from the gold marker
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: originX, y: originY },
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFFFFF'],
        startVelocity: 25,
        gravity: 0.8,
        scalar: 0.9,
        ticks: 120,
      });
    }
  }, [animationComplete, hasCelebrated]);

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-4 sm:mb-6"
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
          <span className="text-cyan-500">📈</span> Our Journey to One Million
        </h2>
        <p className="text-gray-400 max-w-xl text-xs sm:text-sm">
          From zero to one million — watch the community grow post by post.
        </p>
      </motion.div>

      <div
        ref={chartRef}
        className="h-[280px] sm:h-[350px] lg:h-[400px] w-full bg-[#1a1a1a]/50 p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-white/5 backdrop-blur-sm shadow-2xl overflow-hidden relative"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={cappedData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
            <defs>
              <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02}/>
              </linearGradient>
              {/* Clip path for reveal animation - stops at 1M point */}
              <clipPath id="revealClip">
                <motion.rect
                  x="0"
                  y="0"
                  height="100%"
                  initial={{ width: '0%' }}
                  animate={{ width: isInView ? `${millionPct}%` : '0%' }}
                  transition={{ duration: ANIMATION_DURATION, ease: 'easeOut' }}
                />
              </clipPath>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#666"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dy={10}
              tickFormatter={formatDate}
              interval={Math.floor(cappedData.length / 6)}
            />
            <YAxis
              stroke="#666"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={45}
              domain={[0, 1000000]}
              ticks={Y_TICKS}
              allowDataOverflow={false}
            />
            {/* Horizontal grid lines at each Y tick */}
            {Y_TICKS.map((tick) => (
              <ReferenceLine key={tick} y={tick} stroke="#333" strokeDasharray="3 3" />
            ))}
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#06B6D4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#cumulativeGrad)"
              clipPath="url(#revealClip)"
              isAnimationActive={false}
              activeDot={{ r: 6, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }}
            />
            {/* Gold 1M milestone marker - only shows after animation completes */}
            {animationComplete && millionPoint && (
              <ReferenceDot
                x={millionPoint.date}
                y={990000}
                r={10}
                fill="#FFD700"
                stroke="#FFA500"
                strokeWidth={3}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </section>
  );
};

export default Timeline;
