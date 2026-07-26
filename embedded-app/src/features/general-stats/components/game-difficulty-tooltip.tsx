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
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="w-64 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-2xl backdrop-blur"
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
