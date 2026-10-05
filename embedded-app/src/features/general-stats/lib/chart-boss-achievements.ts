import type { GameComparison } from '@/live-stats.types';
import type { ChartBoss, ChartBossWinners } from '../general-stats.types';

const winnerBy = (
  bosses: ChartBoss[],
  metric: (boss: ChartBoss) => number | null,
) => {
  const winner = bosses.reduce<ChartBoss | null>((best, candidate) => {
    const score = metric(candidate);
    if (score === null) return best;
    if (!best) return candidate;
    const bestScore = metric(best);
    return bestScore === null || score > bestScore ? candidate : best;
  }, null);
  return winner ? { gameId: winner.gameId, bossName: winner.boss.name } : null;
};

export const getChartBossWinners = (
  games: GameComparison[],
): ChartBossWinners => {
  const bosses = games
    .flatMap((game) => {
      const unique = new Map<string, ChartBoss>();
      for (const boss of Object.values(game.bossHighlights)) {
        if (boss) unique.set(boss.name, { gameId: game.id, boss });
      }
      return [...unique.values()];
    })
    .sort(
      (left, right) =>
        left.gameId.localeCompare(right.gameId) ||
        left.boss.name.localeCompare(right.boss.name),
    );

  return {
    MOST_DEATHS: winnerBy(bosses, ({ boss }) => boss.attempts),
    LONGEST_WINNING_ATTEMPT: winnerBy(
      bosses,
      ({ boss }) => boss.winningAttemptSeconds,
    ),
    TOUGHEST_OVERALL: winnerBy(bosses, ({ boss }) => {
      if (
        boss.winningAttemptSeconds === null ||
        boss.winningAttemptSeconds <= 0
      )
        return null;
      return Math.sqrt(boss.attempts * boss.winningAttemptSeconds);
    }),
  };
};
