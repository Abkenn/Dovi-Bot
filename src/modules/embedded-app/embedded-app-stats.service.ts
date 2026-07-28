import { BOT_GUILDS } from '../../config/discord-access';
import { findEmbeddedAppGameStats } from '../../data/queries/embedded-app-stats';
import {
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import {
  getGameBossStatsRows,
  hasTrackedBossKill,
  summarizeCombinedBossStats,
  summarizeGameDeathTotals,
} from '../bosses/bosses.stats';
import { getStreamInfo } from '../stream-info/stream-info.service';
import {
  type GeneralStatsGameInput,
  summarizeEmbeddedAppGeneralStats,
} from './embedded-app-general-stats';
import type {
  EmbeddedAppArchivedGame,
  EmbeddedAppBoss,
  EmbeddedAppBossAchievement,
  EmbeddedAppBossMetrics,
  EmbeddedAppCurrentBoss,
  EmbeddedAppGeneralStats,
  EmbeddedAppLastKilledBoss,
  EmbeddedAppStats,
  EmbeddedAppStreamEncounter,
} from './embedded-app-stats.types';

const OPEN_STATUSES = [
  BossTrackingSessionStatus.ACTIVE,
  BossTrackingSessionStatus.PAUSED,
] as const;
const STREAM_SESSION_GAP_MS = 8 * 60 * 60 * 1_000;

type EmbeddedAppStatsQuery = NonNullable<
  Awaited<ReturnType<typeof findEmbeddedAppGameStats>>
>;
type EmbeddedAppStatsSession = EmbeddedAppStatsQuery['sessions'][number];
type EmbeddedAppArchiveGame = EmbeddedAppStatsQuery['archiveGames'][number];
type EmbeddedAppCurrentBossState = Omit<
  EmbeddedAppCurrentBoss,
  keyof EmbeddedAppBossMetrics
>;
type EmbeddedAppStreamEncounterState = Omit<
  EmbeddedAppStreamEncounter,
  keyof EmbeddedAppBossMetrics
>;

const canSummarizeTrackingSessions = (
  sessions: EmbeddedAppArchiveGame['bosses'][number]['trackingSessions'],
) =>
  sessions.every(
    (session) =>
      'boss' in session &&
      Array.isArray(session.attempts) &&
      Array.isArray(session.pauses),
  );

const getFallbackWinningAttemptSeconds = (
  sessions: EmbeddedAppArchiveGame['bosses'][number]['trackingSessions'],
) => {
  const killedSession = sessions.find(
    (session) => session.endResult === BossTrackingEndResult.KILLED,
  );
  const winningAttempt = Array.isArray(killedSession?.attempts)
    ? killedSession.attempts.at(-1)
    : null;

  if (!winningAttempt?.endedAt) {
    return null;
  }

  return Math.round(
    (winningAttempt.endedAt.getTime() - winningAttempt.startedAt.getTime()) /
      1_000,
  );
};

const toCurrentBoss = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppCurrentBossState | null => {
  const session = sessions.find((candidate) =>
    OPEN_STATUSES.some((status) => status === candidate.status),
  );

  if (!session) {
    return null;
  }

  const attempt = session.attempts[0];
  const openPause = session.pauses[0];

  return {
    name: session.boss.name,
    status:
      session.status === BossTrackingSessionStatus.PAUSED
        ? BossTrackingSessionStatus.PAUSED
        : BossTrackingSessionStatus.ACTIVE,
    deaths: session.deathCount,
    attemptNumber: attempt?.attemptNumber ?? null,
    attemptStartedAt: attempt?.startedAt.toISOString() ?? null,
    runbackSeconds:
      attempt?.runbackSeconds ??
      (attempt && attempt.attemptNumber > 1
        ? session.boss.runbackSeconds
        : null),
    pausedAt: session.pausedAt?.toISOString() ?? null,
    pauseReason: openPause?.reason ?? null,
  };
};

const toArchivedGame = (
  game: EmbeddedAppArchiveGame,
): EmbeddedAppArchivedGame => {
  const gameStats = {
    game: { name: game.name },
    stats: game.bosses.flatMap((boss) =>
      boss.stats.map((stat) => ({
        deaths: stat.deaths,
        boss: { id: boss.id, name: boss.name },
      })),
    ),
    trackedBosses: game.bosses.map((boss) => ({
      id: boss.id,
      name: boss.name,
      trackingSessions: boss.trackingSessions,
    })),
  };
  const outcomes = new Map<string, EmbeddedAppBoss['outcome']>();
  const metrics = new Map<
    string,
    Pick<
      EmbeddedAppBoss,
      'attempts' | 'averageAttemptSeconds' | 'winningAttemptSeconds'
    >
  >();

  for (const boss of game.bosses) {
    const combinedStats = canSummarizeTrackingSessions(boss.trackingSessions)
      ? summarizeCombinedBossStats(boss)
      : null;
    const importedStat = boss.stats[0];
    const deaths =
      combinedStats?.deaths ??
      importedStat?.deaths ??
      boss.trackingSessions.reduce(
        (total, session) => total + session.deathCount,
        0,
      );
    metrics.set(boss.name, {
      attempts: deaths + 1,
      averageAttemptSeconds:
        combinedStats?.averageAttemptSeconds ??
        (importedStat?.totalAttemptTimeSeconds === null ||
        importedStat?.totalAttemptTimeSeconds === undefined
          ? null
          : Math.round(importedStat.totalAttemptTimeSeconds / (deaths + 1))),
      winningAttemptSeconds:
        combinedStats?.winningAttemptSeconds ??
        importedStat?.winningAttemptTimeSeconds ??
        getFallbackWinningAttemptSeconds(boss.trackingSessions) ??
        null,
    });

    if (boss.stats.length > 0 || hasTrackedBossKill(boss.trackingSessions)) {
      outcomes.set(boss.name, 'KILLED');
      continue;
    }

    const openSession = boss.trackingSessions.find((session) =>
      OPEN_STATUSES.some((status) => status === session.status),
    );

    if (openSession) {
      outcomes.set(
        boss.name,
        openSession.status === BossTrackingSessionStatus.ACTIVE
          ? 'ACTIVE'
          : 'PAUSED',
      );
    }
  }

  const bosses = getGameBossStatsRows(gameStats, { limit: null }).flatMap(
    ({ name, deaths }) => {
      const outcome = outcomes.get(name);
      const bossMetrics = metrics.get(name);
      return outcome && bossMetrics
        ? [
            {
              name,
              deaths,
              outcome,
              ...bossMetrics,
              achievements: [],
            },
          ]
        : [];
    },
  );
  const killedBossCount = bosses.filter(
    (boss) => boss.outcome === 'KILLED',
  ).length;
  const killedBosses = bosses.filter((boss) => boss.outcome === 'KILLED');
  const trackedTotalDeaths =
    game.trackingSessions
      .map((session) => session.finalDeaths)
      .filter((deaths) => deaths !== null)
      .sort((left, right) => right - left)[0] ?? null;
  const deathTotals = summarizeGameDeathTotals({
    bossDeaths: bosses.reduce((total, boss) => total + boss.deaths, 0),
    trackedTotalDeaths,
  });

  return {
    id: game.id,
    name: game.name,
    deaths: deathTotals.totalDeaths,
    bossDeaths: deathTotals.bossDeaths,
    nonBossDeaths: deathTotals.nonBossDeaths,
    killedBossCount,
    bosses,
    killedBosses,
  };
};

const toGeneralStatsGame = (
  game: EmbeddedAppArchiveGame,
  archivedGame: EmbeddedAppArchivedGame,
): GeneralStatsGameInput => ({
  id: game.id,
  name: game.name,
  bosses: archivedGame.bosses
    .filter((boss) => boss.outcome === 'KILLED')
    .map((boss) => ({
      name: boss.name,
      deaths: boss.deaths,
      averageAttemptSeconds: boss.averageAttemptSeconds ?? null,
      winningAttemptSeconds: boss.winningAttemptSeconds ?? null,
    })),
});

const addGameBossAchievements = (
  game: EmbeddedAppArchivedGame,
  comparison: EmbeddedAppGeneralStats['games'][number] | undefined,
): EmbeddedAppArchivedGame => {
  const getAchievements = (bossName: string) => {
    if (!comparison) {
      return [];
    }

    const achievements: EmbeddedAppBossAchievement[] = [];

    if (comparison.bossHighlights.mostAttempts.name === bossName) {
      achievements.push('MOST_DEATHS');
    }
    if (comparison.bossHighlights.longestWinningAttempt?.name === bossName) {
      achievements.push('LONGEST_WINNING_ATTEMPT');
    }
    if (comparison.bossHighlights.toughestOverall?.name === bossName) {
      achievements.push('TOUGHEST_OVERALL');
    }

    return achievements;
  };
  const bosses = game.bosses.map((boss) => ({
    ...boss,
    achievements: getAchievements(boss.name),
  }));

  return {
    ...game,
    bosses,
    killedBosses: bosses.filter((boss) => boss.outcome === 'KILLED'),
  };
};

const getBossMetrics = (
  boss: EmbeddedAppBoss | undefined,
  deaths: number,
): EmbeddedAppBossMetrics => ({
  attempts: boss?.attempts ?? deaths + 1,
  averageAttemptSeconds: boss?.averageAttemptSeconds ?? null,
  winningAttemptSeconds: boss?.winningAttemptSeconds ?? null,
  achievements: boss?.achievements ?? [],
});

const toLatestStreamEncounters = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppStreamEncounterState[] => {
  const latestSession = sessions[0];

  if (!latestSession) {
    return [];
  }

  const latestStreamSessions = [latestSession];
  let previousFocusedAt = latestSession.focusedAt;

  for (const session of sessions.slice(1)) {
    const gap = previousFocusedAt.getTime() - session.focusedAt.getTime();

    if (gap > STREAM_SESSION_GAP_MS) {
      break;
    }

    latestStreamSessions.push(session);
    previousFocusedAt = session.focusedAt;
  }

  return toStreamEncounters(latestStreamSessions);
};

const toLastKilledBoss = (
  sessions: EmbeddedAppStatsSession[],
  bosses: EmbeddedAppBoss[],
): EmbeddedAppLastKilledBoss | null => {
  const latestKilledSession = sessions.find(
    (session) => session.endResult === BossTrackingEndResult.KILLED,
  );

  if (!latestKilledSession) {
    return null;
  }

  const boss = bosses.find(
    (candidate) => candidate.name === latestKilledSession.boss.name,
  );

  return {
    name: latestKilledSession.boss.name,
    deaths: boss?.deaths ?? latestKilledSession.deathCount,
  };
};

const toStreamEncounters = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppStreamEncounterState[] => {
  const encounters = new Map<string, EmbeddedAppStreamEncounterState>();

  for (const session of [...sessions].reverse()) {
    const existing = encounters.get(session.boss.name);
    let outcome: EmbeddedAppStreamEncounter['outcome'] = 'LEFT';

    if (session.status === BossTrackingSessionStatus.ACTIVE) {
      outcome = 'ACTIVE';
    } else if (session.status === BossTrackingSessionStatus.PAUSED) {
      outcome = 'PAUSED';
    } else if (session.endResult === BossTrackingEndResult.KILLED) {
      outcome = 'KILLED';
    }

    encounters.set(session.boss.name, {
      name: session.boss.name,
      deaths: (existing?.deaths ?? 0) + session.deathCount,
      outcome,
    });
  }

  return [...encounters.values()];
};

const toCurrentStreamEncounters = (
  sessions: EmbeddedAppStatsSession[],
  currentStream: { startAt: Date; endAt: Date },
) =>
  toStreamEncounters(
    sessions.filter(
      (session) =>
        session.focusedAt >= currentStream.startAt &&
        session.focusedAt <= currentStream.endAt,
    ),
  );

const toPreviousStreamEncounters = (
  sessions: EmbeddedAppStatsSession[],
  previousStream: { startAt: Date },
  nextStream: { startAt: Date } | null,
) =>
  toStreamEncounters(
    sessions.filter((session) => {
      if (session.focusedAt < previousStream.startAt) {
        return false;
      }

      return nextStream ? session.focusedAt < nextStream.startAt : true;
    }),
  );

export const getEmbeddedAppStats = async (
  guildId: string,
): Promise<EmbeddedAppStats> => {
  const result = await findEmbeddedAppGameStats([
    BOT_GUILDS.STAGING_ENV,
    BOT_GUILDS.PROD_ENV,
  ]);
  const baseGames = result.archiveGames
    .map(toArchivedGame)
    .sort((left, right) => {
      if (left.id === result.game?.id) {
        return -1;
      }
      if (right.id === result.game?.id) {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
  const archivedGamesById = new Map(baseGames.map((game) => [game.id, game]));
  const generalStats = summarizeEmbeddedAppGeneralStats(
    result.archiveGames.flatMap((game) => {
      const archivedGame = archivedGamesById.get(game.id);
      return archivedGame ? [toGeneralStatsGame(game, archivedGame)] : [];
    }),
  );
  const comparisonsByGameId = new Map(
    generalStats.games.map((game) => [game.id, game]),
  );
  const games = baseGames.map((game) =>
    addGameBossAchievements(game, comparisonsByGameId.get(game.id)),
  );

  if (!result.game) {
    return {
      game: null,
      currentBoss: null,
      lastKilledBoss: null,
      currentStreamWindow: null,
      streamEncounters: [],
      bosses: [],
      killedBosses: [],
      games,
      generalStats,
    };
  }

  const streamInfo = await getStreamInfo(guildId);
  const currentStream = streamInfo.current;
  let streamEncounterStates: EmbeddedAppStreamEncounterState[];

  if (currentStream) {
    streamEncounterStates = toCurrentStreamEncounters(
      result.sessions,
      currentStream,
    );
  } else if (streamInfo.previous) {
    streamEncounterStates = toPreviousStreamEncounters(
      result.sessions,
      streamInfo.previous,
      streamInfo.next,
    );
  } else {
    streamEncounterStates = toLatestStreamEncounters(result.sessions);
  }
  const currentGameArchive = games.find((game) => game.id === result.game?.id);
  const bosses = currentGameArchive?.bosses ?? [];
  const bossesByName = new Map(bosses.map((boss) => [boss.name, boss]));
  const streamEncounters = streamEncounterStates.map((encounter) => ({
    ...encounter,
    ...getBossMetrics(bossesByName.get(encounter.name), encounter.deaths),
  }));
  const currentBossState = toCurrentBoss(result.sessions);
  const currentBoss = currentBossState
    ? {
        ...currentBossState,
        ...getBossMetrics(
          bossesByName.get(currentBossState.name),
          currentBossState.deaths,
        ),
      }
    : null;
  const archivedTrackedTotal =
    currentGameArchive?.nonBossDeaths === null ||
    currentGameArchive?.nonBossDeaths === undefined
      ? null
      : currentGameArchive.deaths;
  const liveTrackedTotal =
    result.gameDeaths > (currentGameArchive?.bossDeaths ?? result.gameDeaths)
      ? result.gameDeaths
      : null;
  const currentDeathTotals = summarizeGameDeathTotals({
    bossDeaths: currentGameArchive?.bossDeaths ?? result.gameDeaths,
    trackedTotalDeaths: Math.max(
      archivedTrackedTotal ?? 0,
      liveTrackedTotal ?? 0,
    ),
  });

  return {
    game: {
      id: result.game.id,
      name: result.game.name,
      deaths: currentDeathTotals.totalDeaths,
      bossDeaths: currentDeathTotals.bossDeaths,
      nonBossDeaths: currentDeathTotals.nonBossDeaths,
      killedBossCount: currentGameArchive?.killedBossCount ?? 0,
    },
    currentBoss,
    lastKilledBoss: toLastKilledBoss(result.sessions, bosses),
    currentStreamWindow: currentStream
      ? {
          startAt: currentStream.startAt.toISOString(),
          endAt: currentStream.endAt.toISOString(),
        }
      : null,
    streamEncounters,
    bosses,
    killedBosses: bosses.filter((boss) => boss.outcome === 'KILLED'),
    games,
    generalStats,
  };
};
