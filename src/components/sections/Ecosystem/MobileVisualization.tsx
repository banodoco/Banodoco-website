import { COLORS, type Stats } from './config';
import { AnimatedNumber } from './AnimatedNumber';

interface MobileVisualizationProps {
  progress: number;
  stats: Stats;
  waveX?: number | null;
}

interface StageProps {
  label: string;
  color: string;
  value: number;
  isCenter?: boolean;
  progress: number;
  isActive?: boolean;
  scale?: number; // 0-1, controls visual width/prominence
}

const Stage: React.FC<StageProps> = ({ label, color, value, isCenter, isActive, scale = 1 }) => {
  // Width scales from min 60% to max 100% based on scale prop
  const widthPercent = isCenter ? 45 : 55 + scale * 35;
  
  return (
    <div className="flex flex-col items-center py-0.5 sm:py-1 md:py-1.5 lg:py-2 shrink-0">
      <div 
        className={`
          relative overflow-hidden rounded-lg md:rounded-xl transition-all duration-700 ease-out
          ${isCenter ? 'px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5' : 'px-3 py-1.5 sm:px-4 sm:py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-4'}
        `}
        style={{
          width: `${widthPercent}%`,
          background: isCenter 
            ? `linear-gradient(135deg, ${color}15, ${color}30)`
            : `linear-gradient(135deg, ${color}08, ${color}18)`,
          boxShadow: isActive 
            ? `0 0 25px ${color}40, 0 0 50px ${color}20, inset 0 0 20px ${color}10`
            : `0 0 15px ${color}15, inset 0 0 10px ${color}05`,
          border: `1px solid ${color}${isActive ? '60' : '30'}`,
        }}
      >
        {/* Animated border glow */}
        <div 
          className="absolute inset-0 rounded-xl opacity-50 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, ${color}00, ${color}20, ${color}00)`,
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        />
        
        <div className={`flex ${isCenter ? 'flex-row gap-2 justify-center' : 'flex-row justify-between'} items-center relative z-10`}>
          <span 
            className={`font-medium tracking-wide ${isCenter ? 'text-[10px] sm:text-xs md:text-sm lg:text-sm opacity-70' : 'text-xs sm:text-sm md:text-base lg:text-lg'}`}
            style={{ color: isCenter ? '#94a3b8' : color }}
          >
            {label}
          </span>
          {!isCenter && (
            <div 
              className="font-bold tabular-nums text-base sm:text-lg md:text-xl lg:text-2xl"
              style={{ 
                color: 'white',
                textShadow: `0 0 10px ${color}60`,
              }}
            >
              <AnimatedNumber value={value} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface FlowLineProps {
  fromColor: string;
  toColor: string;
  fromWidth: number; // 0-1
  toWidth: number;   // 0-1
  progress: number;
  id: string;
}

const FlowLine: React.FC<FlowLineProps> = ({ fromColor, toColor, fromWidth, toWidth, progress, id }) => {
  // Number of lines scales with progress
  const lineCount = Math.floor(2 + progress * 4);
  
  // Calculate spreads based on widths (percentage of container)
  const fromSpread = 20 + fromWidth * 30;
  const toSpread = 20 + toWidth * 30;
  
  return (
    <div className="relative h-4 sm:h-6 md:h-8 lg:h-10 w-full flex items-center justify-center overflow-hidden shrink">
      {/* Flow lines SVG */}
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`flow-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fromColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={toColor} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        
        {/* Ribbon/fill area */}
        <path
          d={`
            M ${50 - fromSpread/2} 0 
            Q ${50 - (fromSpread + toSpread)/4} 50, ${50 - toSpread/2} 100
            L ${50 + toSpread/2} 100
            Q ${50 + (fromSpread + toSpread)/4} 50, ${50 + fromSpread/2} 0
            Z
          `}
          fill={`url(#flow-grad-${id})`}
          opacity={0.15 + progress * 0.15}
        />
        
        {/* Individual lines */}
        {Array.from({ length: lineCount }).map((_, i) => {
          const t = lineCount > 1 ? i / (lineCount - 1) : 0.5;
          const startX = 50 + (t - 0.5) * fromSpread;
          const endX = 50 + (t - 0.5) * toSpread;
          
          return (
            <path
              key={i}
              d={`M ${startX} 0 Q 50 50 ${endX} 100`}
              stroke={`url(#flow-grad-${id})`}
              strokeWidth={0.8}
              fill="none"
              opacity={0.6}
            />
          );
        })}
      </svg>
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-flow-down"
            style={{
              left: `${45 + i * 10}%`,
              background: toColor,
              animationDelay: `${i * 600}ms`,
              boxShadow: `0 0 4px ${toColor}`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const MobileVisualization: React.FC<MobileVisualizationProps> = ({ 
  progress, 
  stats,
  waveX 
}) => {
  const isWaveActive = waveX !== null && waveX !== undefined;
  
  // Scale values for the funnel effect (0-1, how wide each stage appears)
  // Contributors → Tools → Artists → Fans (expanding outward)
  const contribScale = 0.3 + progress * 0.2;
  const toolsScale = 0.4 + progress * 0.3;
  const artistsScale = 0.6 + progress * 0.3;
  const fansScale = 0.8 + progress * 0.2;
  
  return (
    <div className="w-full max-w-[280px] sm:max-w-[360px] md:max-w-[480px] lg:max-w-[520px] mx-auto px-2 h-full max-h-full flex flex-col justify-center overflow-hidden">
      {/* Stages with connecting flow lines */}
      <div className="flex flex-col shrink min-h-0">
        {/* Contributors */}
        <Stage 
          label="Contributors" 
          color={COLORS.contributors} 
          value={stats.contributors}
          progress={progress}
          isActive={isWaveActive}
          scale={contribScale}
        />
        
        <FlowLine 
          fromColor={COLORS.contributors} 
          toColor={COLORS.tools}
          fromWidth={contribScale}
          toWidth={toolsScale}
          progress={progress}
          id="contrib-tools"
        />
        
        {/* Tools */}
        <Stage 
          label="Tools" 
          color={COLORS.tools} 
          value={stats.tools}
          progress={progress}
          isActive={isWaveActive}
          scale={toolsScale}
        />
        
        <FlowLine 
          fromColor={COLORS.tools} 
          toColor={COLORS.artists}
          fromWidth={toolsScale}
          toWidth={artistsScale}
          progress={progress}
          id="tools-artists"
        />
        
        {/* Artists */}
        <Stage 
          label="Artists" 
          color={COLORS.artists} 
          value={stats.artists}
          progress={progress}
          isActive={isWaveActive}
          scale={artistsScale}
        />
        
        <FlowLine 
          fromColor={COLORS.artists} 
          toColor={COLORS.fans}
          fromWidth={artistsScale}
          toWidth={fansScale}
          progress={progress}
          id="artists-fans"
        />
        
        {/* Fans */}
        <Stage 
          label="Fans" 
          color={COLORS.fans} 
          value={stats.fans}
          progress={progress}
          isActive={isWaveActive}
          scale={fansScale}
        />
      </div>
    </div>
  );
};

