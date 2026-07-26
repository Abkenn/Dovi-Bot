import type {
  EmbeddedAppGameComparison,
  EmbeddedAppGeneralStats,
} from './embedded-app-stats.types';

type GeneralStatsBossInput = {
  name: string;
  deaths: number;
  winningAttemptSeconds: number | null;
};

export type GeneralStatsGameInput = {
  id: string;
  name: string;
  bosses: GeneralStatsBossInput[];
};

const average = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const getGameWithLargestMetric = (
  games: EmbeddedAppGameComparison[],
  getMetric: (game: EmbeddedAppGameComparison) => number | null,
) =>
  games.reduce<EmbeddedAppGameComparison | null>((largest, game) => {
    const metric = getMetric(game);

    if (metric === null) {
      return largest;
    }

    if (!largest) {
      return game;
    }

    const largestMetric = getMetric(largest);
    return largestMetric === null || metric > largestMetric ? game : largest;
  }, null);

const getBossWithLargestMetric = (
  bosses: GeneralStatsBossInput[],
  getMetric: (boss: GeneralStatsBossInput) => number | null,
) =>
  bosses.reduce<GeneralStatsBossInput | null>((largest, boss) => {
    const metric = getMetric(boss);

    if (metric === null) {
      return largest;
    }

    if (!largest) {
      return boss;
    }

    const largestMetric = getMetric(largest);
    return largestMetric === null || metric > largestMetric ? boss : largest;
  }, null);

const toBossComparison = (boss: GeneralStatsBossInput | null) =>
  boss
    ? {
        name: boss.name,
        attempts: boss.deaths + 1,
        winningAttemptSeconds: boss.winningAttemptSeconds,
      }
    : null;

const getBossHighlights = (bosses: GeneralStatsBossInput[]) => {
  const maximumAttempts = Math.max(...bosses.map((boss) => boss.deaths + 1));
  const maximumWinningAttempt = Math.max(
    0,
    ...bosses.flatMap((boss) =>
      boss.winningAttemptSeconds === null ? [] : [boss.winningAttemptSeconds],
    ),
  );
  const mostAttempts = getBossWithLargestMetric(
    bosses,
    (boss) => boss.deaths + 1,
  );
  const longestWinningAttempt = getBossWithLargestMetric(
    bosses,
    (boss) => boss.winningAttemptSeconds,
  );
  const toughestOverall = getBossWithLargestMetric(bosses, (boss) => {
    if (
      boss.winningAttemptSeconds === null ||
      maximumAttempts === 0 ||
      maximumWinningAttempt === 0
    ) {
      return null;
    }

    return Math.sqrt(
      ((boss.deaths + 1) / maximumAttempts) *
        (boss.winningAttemptSeconds / maximumWinningAttempt),
    );
  });

  if (!mostAttempts) {
    throw new Error('Boss highlights require at least one defeated boss.');
  }

  return {
    mostAttempts: {
      name: mostAttempts.name,
      attempts: mostAttempts.deaths + 1,
      winningAttemptSeconds: mostAttempts.winningAttemptSeconds,
    },
    longestWinningAttempt: toBossComparison(longestWinningAttempt),
    toughestOverall: toBossComparison(toughestOverall),
  };
};

export const summarizeEmbeddedAppGeneralStats = (
  inputGames: GeneralStatsGameInput[],
): EmbeddedAppGeneralStats => {
  const games = inputGames
    .filter((game) => game.bosses.length > 0)
    .map((game) => {
      const averageDeathsPerBoss = average(
        game.bosses.map((boss) => boss.deaths),
      );
      const winningAttempts = game.bosses.flatMap((boss) =>
        boss.winningAttemptSeconds === null ? [] : [boss.winningAttemptSeconds],
      );

      return {
        id: game.id,
        name: game.name,
        defeatedBossCount: game.bosses.length,
        averageDeathsPerBoss: roundToOneDecimal(averageDeathsPerBoss),
        averageAttemptsPerBoss: roundToOneDecimal(averageDeathsPerBoss + 1),
        averageWinningAttemptSeconds:
          winningAttempts.length > 0
            ? Math.round(average(winningAttempts))
            : null,
        difficultyScore: null,
        bossHighlights: getBossHighlights(game.bosses),
      };
    });
  const maximumDeaths = Math.max(
    0,
    ...games.map((game) => game.averageDeathsPerBoss),
  );
  const maximumWinningAttempt = Math.max(
    0,
    ...games.flatMap((game) =>
      game.averageWinningAttemptSeconds === null
        ? []
        : [game.averageWinningAttemptSeconds],
    ),
  );
  const scoredGames = games.map((game) => {
    if (
      game.averageWinningAttemptSeconds === null ||
      maximumDeaths === 0 ||
      maximumWinningAttempt === 0
    ) {
      return game;
    }

    return {
      ...game,
      difficultyScore: Math.sqrt(
        (game.averageDeathsPerBoss / maximumDeaths) *
          (game.averageWinningAttemptSeconds / maximumWinningAttempt),
      ),
    };
  });

  return {
    games: scoredGames,
    hardestByDeathsGameId:
      getGameWithLargestMetric(scoredGames, (game) => game.averageDeathsPerBoss)
        ?.id ?? null,
    longestWinningAttemptGameId:
      getGameWithLargestMetric(
        scoredGames,
        (game) => game.averageWinningAttemptSeconds,
      )?.id ?? null,
    toughestOverallGameId:
      getGameWithLargestMetric(scoredGames, (game) => game.difficultyScore)
        ?.id ?? null,
  };
};
