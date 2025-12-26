import { useMemo } from 'react';
import { COLORS, STAGE_X, SVG_CONFIG, type Stats } from './config';
import { curvePath, ribbonPath, formatNumber } from './utils';

interface RiverVisualizationProps {
  progress: number;
  stats: Stats;
}

export const RiverVisualization: React.FC<RiverVisualizationProps> = ({ progress, stats }) => {
  const { ribbons, lines, nodes } = useMemo(() => {
    const ribbons: JSX.Element[] = [];
    const lines: JSX.Element[] = [];
    const nodes: JSX.Element[] = [];
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
          style={{ animationDelay: `${i * 30}ms` }}
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
        style={{ animationDelay: '50ms' }}
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
          style={{ animationDelay: `${i * 25}ms` }}
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
        className="ecosystem-ribbon"
        style={{ animationDelay: '100ms' }}
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
            style={{ animationDelay: `${artistLineIdx * 15}ms` }}
          />
        );
        artistLineIdx++;
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
        className="ecosystem-ribbon"
        style={{ animationDelay: '150ms' }}
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
          pathLength={1}
          className="ecosystem-line"
          style={{ animationDelay: `${Math.min(i * 5, 300)}ms` }}
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

