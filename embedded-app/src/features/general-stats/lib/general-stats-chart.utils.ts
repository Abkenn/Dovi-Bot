import type { GameComparison } from '@/live-stats.types';

export const formatStatsDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const findGeneralStatsGame = (
  games: GameComparison[],
  gameId: string | null,
) => games.find((game) => game.id === gameId) ?? null;

export const isGameComparison = (
  candidate: unknown,
): candidate is GameComparison => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  return (
    'id' in candidate &&
    typeof candidate.id === 'string' &&
    'bossHighlights' in candidate
  );
};

export const getGeneralStatsTrend = (games: GameComparison[]) => {
  if (games.length < 2) {
    return null;
  }

  const averageX =
    games.reduce((total, game) => total + game.averageAttemptsPerBoss, 0) /
    games.length;
  const averageY =
    games.reduce(
      (total, game) => total + (game.averageWinningAttemptSeconds ?? 0),
      0,
    ) / games.length;
  const numerator = games.reduce(
    (total, game) =>
      total +
      (game.averageAttemptsPerBoss - averageX) *
        ((game.averageWinningAttemptSeconds ?? 0) - averageY),
    0,
  );
  const denominator = games.reduce(
    (total, game) => total + (game.averageAttemptsPerBoss - averageX) ** 2,
    0,
  );
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = averageY - slope * averageX;

  return { slope, intercept };
};
