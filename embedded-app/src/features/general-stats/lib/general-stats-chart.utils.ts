import type { GameComparison } from '@/live-stats.types';

export const formatStatsDuration = (seconds: number) => {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
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

const getMedian = (values: number[]) => {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const middleValue = sortedValues[middleIndex] ?? 0;

  if (sortedValues.length % 2 === 1) {
    return middleValue;
  }

  return ((sortedValues[middleIndex - 1] ?? 0) + middleValue) / 2;
};

export const getGeneralStatsTrend = (games: GameComparison[]) => {
  if (games.length < 2) {
    return null;
  }

  const slopes = games.flatMap((leftGame, leftIndex) =>
    games.slice(leftIndex + 1).flatMap((rightGame) => {
      const xDifference =
        rightGame.averageAttemptsPerBoss - leftGame.averageAttemptsPerBoss;

      if (xDifference === 0) {
        return [];
      }

      return [
        ((rightGame.averageWinningAttemptSeconds ?? 0) -
          (leftGame.averageWinningAttemptSeconds ?? 0)) /
          xDifference,
      ];
    }),
  );
  const slope = getMedian(slopes);
  const intercept = getMedian(
    games.map(
      (game) =>
        (game.averageWinningAttemptSeconds ?? 0) -
        slope * game.averageAttemptsPerBoss,
    ),
  );

  return { slope, intercept };
};

export const describeGeneralStatsTrend = (slope: number) => {
  if (Math.abs(slope) < 1) {
    return 'Winning-attempt time stays broadly level as attempts increase.';
  }

  if (slope > 0) {
    return 'Games with more attempts also tend to have longer winning attempts.';
  }

  return 'Games with more attempts tend to have shorter winning attempts.';
};
