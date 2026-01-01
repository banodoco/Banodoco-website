import { useMemo, type FC, type ReactElement, type ReactNode } from 'react';
import { COLORS, STAGE_X, SVG_CONFIG, type Stats } from './config';
import { curvePath, ribbonPath } from './utils';
import { AnimatedNumber } from './AnimatedNumber';

interface RiverVisualizationProps {
  progress: number;
  stats: Stats;
  waveX?: number | null; // X position of the distortion wave (null = no wave)
  eventOverlay?: ReactNode;
}

// Label component for consistent styling
interface LabelProps {
  label: string;
  value: number;
  color: string;
  left: string;
  top: string;
  large?: boolean;
}

const Label: FC<LabelProps> = ({ label, value, color, left, top, large }) => (
  <div
    className="absolute pointer-events-auto"
    style={{
      left,
      top,
      transform: 'translate(-50%, -50%)',
      zIndex: 30,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        padding: large ? '8px 14px' : '6px 12px',
        border: `1px solid ${color}40`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: 'system-ui' }}>
        {label}
      </span>
      <span style={{ fontSize: large ? 24 : 18, fontWeight: 'bold', color: 'white', fontFamily: 'system-ui' }}>
        <AnimatedNumber value={value} />
      </span>
    </div>
  </div>
);

export const RiverVisualization: FC<RiverVisualizationProps> = ({ progress, stats, waveX, eventOverlay }) => {
  const { ribbons, lines } = useMemo(() => {
    const ribbons: ReactElement[] = [];
    const lines: ReactElement[] = [];
    const { centerY } = SVG_CONFIG;

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
        className="ecosystem-ribbon"
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
          pathLength={1}
          className="ecosystem-line"
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
        className="ecosystem-ribbon"
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
          pathLength={1}
          className="ecosystem-line"
        />
      );
    }

    // --- STAGE 3: Artists multiplying from Tools ---
    const artistSpread = toolSpread + progress * 115;
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
        className="ecosystem-ribbon"
      />
    );

    let artistLineIdx = 0;
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
            pathLength={1}
            className="ecosystem-line"
          />
        );
        artistLineIdx++;
      }
    });

    // --- STAGE 4: Fans exploding from Artists ---
    const consumerSpread = 35 + progress * 420;
    const artistMin = artistEndpoints.length > 0 ? Math.min(...artistEndpoints) : centerY - 20;
    const artistMax = artistEndpoints.length > 0 ? Math.max(...artistEndpoints) : centerY + 20;
    const consumerLineCount = Math.min(150, Math.floor(15 + progress * 220));

    ribbons.push(
      <path
        key="ribbon-fans"
        d={ribbonPath(
          STAGE_X.artists, artistMin, artistMax,
          STAGE_X.fans, centerY - consumerSpread / 2, centerY + consumerSpread / 2
        )}
        fill={COLORS.fans}
        opacity={0.08 + progress * 0.1}
        className="ecosystem-ribbon"
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
          d={curvePath(STAGE_X.artists, startY, STAGE_X.fans, endY)}
          stroke={COLORS.fans}
          strokeWidth={0.7 + progress * 0.8}
          opacity={0.18 + progress * 0.18}
          fill="none"
          pathLength={1}
          className="ecosystem-line"
        />
      );
    }

    return { ribbons, lines };
  }, [progress]);

  const { centerY, height } = SVG_CONFIG;
  const hasWave = waveX !== null && waveX !== undefined;
  
  // Wave band width in SVG units
  const waveWidth = 80;

  // Calculate label positions as percentages
  const { width, height: svgHeight } = SVG_CONFIG;
  const contribCenterX = (STAGE_X.start + STAGE_X.reigh) / 2;
  const toolsCenterX = (STAGE_X.reigh + STAGE_X.tools) / 2;
  const artistsCenterX = (STAGE_X.tools + STAGE_X.artists) / 2;
  const fansCenterX = (STAGE_X.artists + STAGE_X.fans) / 2;

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${SVG_CONFIG.width} ${SVG_CONFIG.height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Distortion wave filter - uses turbulence masked to a vertical band */}
          <filter id="distortion-wave" x="-10%" y="-10%" width="120%" height="120%">
            {/* Create turbulence pattern for displacement */}
            <feTurbulence 
              type="turbulence" 
              baseFrequency="0.015 0.04" 
              numOctaves="2" 
              seed="42"
              result="turbulence"
            />
            
            {/* Apply displacement using the turbulence */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale="12"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            
            {/* Create a horizontal gradient mask for the wave band */}
            <feFlood floodColor="black" result="black" />
            <feFlood floodColor="white" result="white" />
            
            {/* Composite to create the final masked displacement */}
            <feComposite in="displaced" in2="SourceGraphic" operator="over" />
          </filter>
          
          {/* Clip path that moves with the wave - creates a vertical stripe */}
          {hasWave && (
            <clipPath id="wave-clip">
              <rect 
                x={waveX! - waveWidth / 2} 
                y={0} 
                width={waveWidth} 
                height={height} 
              />
            </clipPath>
          )}
        </defs>

        <g>{ribbons}</g>
        
        {/* Normal lines (not affected by wave) */}
        <g>{lines}</g>
        
        {/* Distorted lines overlay (only in the wave band) */}
        {hasWave && (
          <g 
            clipPath="url(#wave-clip)" 
            filter="url(#distortion-wave)"
            style={{ opacity: 0.9 }}
          >
            {lines}
          </g>
        )}
        
        {/* Event animation overlay */}
        {eventOverlay}
      </svg>

      {/* HTML Labels - positioned above everything with z-index */}
      <Label
        label="Contributors"
        value={stats.contributors}
        color={COLORS.contributors}
        left={`${(contribCenterX / width) * 100}%`}
        top={`${((centerY - 24 - progress * 30) / svgHeight) * 100}%`}
      />
      <Label
        label="Tools"
        value={stats.tools}
        color={COLORS.tools}
        left={`${(toolsCenterX / width) * 100}%`}
        top={`${((centerY - 30 - progress * 40) / svgHeight) * 100}%`}
      />
      <Label
        label="Artists"
        value={stats.artists}
        color={COLORS.artists}
        left={`${(artistsCenterX / width) * 100}%`}
        top={`${((centerY - 40 - progress * 60) / svgHeight) * 100}%`}
      />
      <Label
        label="Fans"
        value={stats.fans}
        color={COLORS.fans}
        left={`${(fansCenterX / width) * 100}%`}
        top={`${((centerY - 50 - progress * 80) / svgHeight) * 100}%`}
      />
    </div>
  );
};
