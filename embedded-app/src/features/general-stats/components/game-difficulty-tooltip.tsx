import { motion, useReducedMotion } from 'motion/react';
import type {
  BossAchievement,
  BossComparison,
  GameComparison,
} from '@/live-stats.types';
import type { ChartBossWinners } from '../general-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';
import { BossHighlight } from './boss-highlight';

type GameDifficultyTooltipProps = {
  game: GameComparison;
  winners?: ChartBossWinners;
};

export const GameDifficultyTooltip = ({
  game,
  winners,
}: GameDifficultyTooltipProps) => {
  const reducedMotion = useReducedMotion();
  const { mostAttempts, longestWinningAttempt, toughestOverall } =
    game.bossHighlights;

  const achievementsFor = (
    boss: BossComparison | null,
    previousBosses: (BossComparison | null)[] = [],
  ): BossAchievement[] => {
    if (
      !boss ||
      previousBosses.some((previous) => previous?.name === boss.name)
    )
      return [];
    const achievements: BossAchievement[] = [];
    for (const achievement of [
      'MOST_DEATHS',
      'LONGEST_WINNING_ATTEMPT',
      'TOUGHEST_OVERALL',
    ] as const) {
      const winner = winners?.[achievement];
      if (winner?.gameId === game.id && winner.bossName === boss.name)
        achievements.push(achievement);
    }
    return achievements;
  };

  return (
    <motion.div
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 2 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}
      className="w-64 rounded-xl border border-primary/40 bg-[radial-gradient(circle_at_center,oklch(0.19_0.025_285/0.98),oklch(0.145_0.014_285/0.98))] p-3 shadow-lg backdrop-blur"
    >
      <p className="mb-2 font-bold">{game.name}</p>
      <div className="space-y-2">
        <BossHighlight
          label="Most attempts"
          boss={mostAttempts}
          achievementScope="chart"
          achievements={achievementsFor(mostAttempts)}
          detail={`${mostAttempts.attempts} attempts`}
        />
        <BossHighlight
          label="Longest winning attempt"
          boss={longestWinningAttempt}
          achievementScope="chart"
          achievements={achievementsFor(longestWinningAttempt, [mostAttempts])}
          detail={
            longestWinningAttempt?.winningAttemptSeconds
              ? formatStatsDuration(longestWinningAttempt.winningAttemptSeconds)
              : ''
          }
        />
        <BossHighlight
          label="Most difficult boss"
          boss={toughestOverall}
          achievementScope="chart"
          achievements={achievementsFor(toughestOverall, [
            mostAttempts,
            longestWinningAttempt,
          ])}
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
