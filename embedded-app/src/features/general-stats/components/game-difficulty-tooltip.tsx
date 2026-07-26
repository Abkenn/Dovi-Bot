import { motion } from 'motion/react';
import type { GameComparison } from '@/live-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';
import { BossHighlight } from './boss-highlight';

type GameDifficultyTooltipProps = {
  game: GameComparison;
};

export const GameDifficultyTooltip = ({ game }: GameDifficultyTooltipProps) => {
  const { mostAttempts, longestWinningAttempt, toughestOverall } =
    game.bossHighlights;

  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: [
          '0 12px 32px oklch(0 0 0 / 0.32), 0 0 10px oklch(0.65 0.225 20 / 0.08)',
          '0 12px 32px oklch(0 0 0 / 0.32), 0 0 16px oklch(0.65 0.225 20 / 0.13)',
          '0 12px 32px oklch(0 0 0 / 0.32), 0 0 10px oklch(0.65 0.225 20 / 0.08)',
        ],
      }}
      transition={{
        opacity: { duration: 0.1 },
        y: { duration: 0.1 },
        boxShadow: { duration: 1.8, repeat: Number.POSITIVE_INFINITY },
      }}
      className="w-64 rounded-xl border border-primary/40 bg-[radial-gradient(circle_at_center,oklch(0.19_0.025_285/0.98),oklch(0.145_0.014_285/0.98))] p-3 backdrop-blur"
    >
      <p className="mb-2 font-bold">{game.name}</p>
      <div className="space-y-2">
        <BossHighlight
          label="Most attempts"
          boss={mostAttempts}
          detail={`${mostAttempts.attempts} attempts`}
        />
        <BossHighlight
          label="Longest winning attempt"
          boss={longestWinningAttempt}
          detail={
            longestWinningAttempt?.winningAttemptSeconds
              ? formatStatsDuration(longestWinningAttempt.winningAttemptSeconds)
              : ''
          }
        />
        <BossHighlight
          label="Toughest balanced boss"
          boss={toughestOverall}
          detail={
            toughestOverall
              ? `${toughestOverall.attempts} attempts / ${
                  toughestOverall.winningAttemptSeconds
                    ? formatStatsDuration(toughestOverall.winningAttemptSeconds)
                    : 'untimed win'
                }`
              : ''
          }
        />
      </div>
    </motion.div>
  );
};
