import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { GameComparison } from '@/live-stats.types';
import type { ChartBossWinners } from '../general-stats.types';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type LockedGameTooltipProps = {
  game: GameComparison;
  winners: ChartBossWinners;
  position: { x: number; y: number } | null;
};

export const LockedGameTooltip = ({
  game,
  winners,
  position,
}: LockedGameTooltipProps) => {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.12, ease: 'easeOut' }}
      aria-hidden={!isPresent}
      className={cn(
        'locked-chart-popup absolute z-30',
        !position && 'top-24 right-6',
        !isPresent && 'pointer-events-none',
      )}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <GameDifficultyTooltip game={game} winners={winners} />
    </motion.div>
  );
};
