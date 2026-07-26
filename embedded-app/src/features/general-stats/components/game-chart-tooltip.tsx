import type { TooltipContentProps } from 'recharts';
import { isGameComparison } from '../lib/general-stats-chart.utils';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type GameChartTooltipProps = TooltipContentProps;

export const GameChartTooltip = ({
  active,
  payload,
}: GameChartTooltipProps) => {
  const game = payload
    .map((entry) => {
      const candidate: unknown = entry.payload;
      return isGameComparison(candidate) ? candidate : null;
    })
    .find((candidate) => candidate !== null);

  if (!active || !game) {
    return null;
  }

  return <GameDifficultyTooltip game={game} />;
};
