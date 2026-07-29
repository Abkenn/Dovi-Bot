import type { SyntheticEvent } from 'react';
import type { GameComparison } from '@/live-stats.types';
import type { GameChartCluster } from '../lib/general-stats-chart.utils';

type GameDotLabelProps = {
  clusters?: GameChartCluster<GameComparison>[];
  games?: GameComparison[];
  index?: number;
  onClusterEnter?: (cluster: GameChartCluster<GameComparison>) => void;
  onClusterLeave?: () => void;
  onClusterSelect?: (cluster: GameChartCluster<GameComparison>) => void;
  onGameEnter?: (game: GameComparison) => void;
  onGameLeave?: () => void;
  onGameSelect?: (game: GameComparison) => void;
  value?: string;
  x?: number;
  y?: number;
};

const LABEL_OFFSETS = [{ y: -20 }, { y: 28 }, { y: -36 }, { y: 44 }] as const;

export const GameDotLabel = ({
  clusters = [],
  games = [],
  index = 0,
  onClusterEnter,
  onClusterLeave,
  onClusterSelect,
  onGameEnter,
  onGameLeave,
  onGameSelect,
  value,
  x = 0,
  y = 0,
}: GameDotLabelProps) => {
  const game = games[index];

  if (!value || !game) {
    return null;
  }

  const cluster = clusters.find((candidate) =>
    candidate.games.some((clusterGame) => clusterGame.id === game.id),
  );

  if (cluster && cluster.games[0]?.id !== game.id) {
    return null;
  }

  const offset = LABEL_OFFSETS[index % LABEL_OFFSETS.length];
  const label = cluster ? `${cluster.games.length} games` : value;
  const labelWidth = Math.max(54, label.length * 6.6 + 18);
  const labelY = y + offset.y;
  const lineStartY = offset.y < 0 ? y - 8 : y + 8;
  const lineEndY = offset.y < 0 ? labelY + 9 : labelY - 17;
  const handleEnter = () => {
    if (cluster) {
      onClusterEnter?.(cluster);
      return;
    }

    onGameEnter?.(game);
  };
  const handleLeave = () => {
    if (cluster) {
      onClusterLeave?.();
      return;
    }

    onGameLeave?.();
  };
  const handleSelect = (event: SyntheticEvent<SVGGElement>) => {
    event.stopPropagation();

    if (cluster) {
      onClusterSelect?.(cluster);
      return;
    }

    onGameSelect?.(game);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG chart labels cannot use HTML button elements.
    <g
      role="button"
      aria-label={
        cluster ? `Explore ${cluster.games.length} nearby games` : value
      }
      tabIndex={0}
      className="difficulty-label cursor-pointer outline-none"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleSelect(event);
        }
      }}
    >
      <line
        x1={x}
        x2={x}
        y1={lineStartY}
        y2={lineEndY}
        stroke="var(--primary)"
        strokeOpacity={cluster ? 0.65 : 0.38}
        strokeWidth={cluster ? 1.5 : 1}
        pointerEvents="none"
      />
      <rect
        x={x - labelWidth / 2}
        y={labelY - 13}
        width={labelWidth}
        height={20}
        rx={10}
        fill="var(--card)"
        fillOpacity={0.96}
        stroke="var(--primary)"
        strokeOpacity={cluster ? 0.55 : 0.22}
        strokeWidth={1}
      />
      <text
        x={x}
        y={labelY + 1}
        fill={cluster ? 'var(--primary)' : 'var(--foreground)'}
        fontSize={11}
        fontWeight={cluster ? 700 : 600}
        textAnchor="middle"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
};
