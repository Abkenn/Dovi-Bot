import type { TooltipContentProps } from 'recharts';
import type { GameComparison } from '@/live-stats.types';
import type { ChartBossWinners } from '../general-stats.types';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type GameChartTooltipProps = TooltipContentProps & {
  winners?: ChartBossWinners;
};

const isGameComparison = (candidate: unknown): candidate is GameComparison =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      'id' in candidate &&
      'bossHighlights' in candidate,
  );

export const GameChartTooltip = ({
  active,
  payload,
  winners,
}: GameChartTooltipProps) => {
  const game = payload?.[0]?.payload;

  if (!active || !isGameComparison(game)) {
    return null;
  }

  return <GameDifficultyTooltip game={game} winners={winners} />;
};
