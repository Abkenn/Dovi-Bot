import { BossTrackingEndResult } from '../../generated/prisma/enums';
import type { BossTrackingSessionView } from '../boss-tracking/boss-tracking.types';
import { summarizeBossTrackingSessions } from '../boss-tracking/boss-tracking-stats';

type BossWithDaviStats = {
  stats: {
    deaths: number | null;
    totalAttemptTimeSeconds: number | null;
    winningAttemptTimeSeconds: number | null;
    difficultyCoefficient: { toString(): string } | null;
  }[];
};

export type BossWithBotTrackedStats = {
  trackingSessions: BossTrackingSessionView[];
};

type BossWithStats = BossWithDaviStats & BossWithBotTrackedStats;

type GameBossWithTrackedSessions = {
  id: string;
  name: string;
  trackingSessions: {
    deathCount: number;
    endResult: BossTrackingEndResult | null;
  }[];
};

type GameDeathRankingStats = {
  game: { name: string };
  stats: {
    deaths: number | null;
    boss: { id: string; name: string };
  }[];
  trackedBosses: GameBossWithTrackedSessions[];
};

type GameTrackingStatusStats = {
  name: string;
  trackingSessions: {
    startDeaths: number;
    deathCount: number;
    finalDeaths: number | null;
  }[];
  bosses: (GameBossWithTrackedSessions & {
    stats?: { deaths: number | null }[];
  })[];
};

type RecentBossEncounterStats = {
  name: string;
  stats?: BossWithDaviStats['stats'];
  trackingSessions: BossTrackingSessionView[];
};

export const getTrackedBossDeathCount = (sessions: { deathCount: number }[]) =>
  sessions.reduce((sum, session) => sum + session.deathCount, 0);

export const hasTrackedBossKill = (
  sessions: { endResult: BossTrackingEndResult | null }[],
) =>
  sessions.some(
    (session) => session.endResult === BossTrackingEndResult.KILLED,
  );

export const summarizeCombinedBossStats = (boss: BossWithStats) => {
  const daviStats = boss.stats[0] ?? null;
  const trackedSessions = boss.trackingSessions;
  const trackedStats = summarizeBossTrackingSessions(trackedSessions);
  const trackedDeathCount = getTrackedBossDeathCount(trackedSessions);
  const deaths =
    (daviStats?.deaths ?? 0) +
    (trackedSessions.length > 0 ? trackedDeathCount : 0);
  const daviAttemptCount =
    daviStats?.totalAttemptTimeSeconds !== null &&
    daviStats?.totalAttemptTimeSeconds !== undefined &&
    daviStats.deaths !== null
      ? daviStats.deaths + 1
      : 0;
  const averageAttemptSeconds =
    (daviStats?.totalAttemptTimeSeconds ?? 0) +
    (trackedStats.totalAttemptSecondsWithoutRunbacks ?? 0);
  const averageAttemptCount =
    daviAttemptCount + trackedStats.averageAttemptCount;
  const averageAttempt =
    averageAttemptSeconds > 0 && averageAttemptCount > 0
      ? Math.round(averageAttemptSeconds / averageAttemptCount)
      : null;
  const totalAttemptSeconds =
    (daviStats?.totalAttemptTimeSeconds ?? 0) +
    (trackedStats.totalAttemptSeconds ?? 0);
  const hasDaviStats =
    daviStats !== null &&
    (daviStats.deaths !== null ||
      daviStats.totalAttemptTimeSeconds !== null ||
      daviStats.winningAttemptTimeSeconds !== null ||
      daviStats.difficultyCoefficient !== null);

  if (!hasDaviStats && trackedSessions.length === 0) {
    return null;
  }

  return {
    deaths: deaths > 0 || daviStats?.deaths !== null ? deaths : null,
    totalAttemptSeconds: totalAttemptSeconds > 0 ? totalAttemptSeconds : null,
    averageAttemptSeconds: averageAttempt,
    winningAttemptSeconds:
      daviStats?.winningAttemptTimeSeconds ??
      trackedStats.winningAttemptSeconds,
    difficultyCoefficient: daviStats?.difficultyCoefficient ?? null,
    totalAttemptSecondsWithoutRunbacks:
      trackedStats.totalAttemptSecondsWithoutRunbacks,
  };
};

export const summarizeBotTrackedBossStats = (boss: BossWithBotTrackedStats) => {
  const sessions = boss.trackingSessions;

  if (sessions.length === 0) {
    return null;
  }

  const trackedStats = summarizeBossTrackingSessions(sessions);

  return {
    deaths: getTrackedBossDeathCount(sessions),
    killed: hasTrackedBossKill(sessions),
    sessionCount: sessions.length,
    totalAttemptSeconds: trackedStats.totalAttemptSeconds,
    averageAttemptSeconds: trackedStats.averageAttemptSeconds,
    winningAttemptSeconds: trackedStats.winningAttemptSeconds,
    totalAttemptSecondsWithoutRunbacks:
      trackedStats.totalAttemptSecondsWithoutRunbacks,
  };
};

export const getGameBossStatsRows = (
  gameStats: GameDeathRankingStats,
  options: { limit?: number | null } = {},
) => {
  const rows = new Map<
    string,
    { name: string; deaths: number; hasDeaths: boolean }
  >();

  for (const stat of gameStats.stats) {
    rows.set(stat.boss.id, {
      name: stat.boss.name,
      deaths: stat.deaths ?? 0,
      hasDeaths: stat.deaths !== null,
    });
  }

  for (const boss of gameStats.trackedBosses) {
    const existing = rows.get(boss.id);
    const trackedDeaths = getTrackedBossDeathCount(boss.trackingSessions);

    rows.set(boss.id, {
      name: boss.name,
      deaths: (existing?.deaths ?? 0) + trackedDeaths,
      hasDeaths: true,
    });
  }

  const sortedRows = [...rows.values()]
    .filter((row) => row.hasDeaths)
    .sort((left, right) => {
      if (right.deaths !== left.deaths) {
        return right.deaths - left.deaths;
      }

      return left.name.localeCompare(right.name);
    });

  if (options.limit === null) {
    return sortedRows;
  }

  return sortedRows.slice(0, options.limit ?? 10);
};

export const summarizeTrackedGameStatus = (game: GameTrackingStatusStats) => {
  const encounteredBosses = game.bosses.filter(
    (boss) => (boss.stats?.length ?? 0) > 0 || boss.trackingSessions.length > 0,
  );
  const killedBosses = encounteredBosses.filter(
    (boss) =>
      (boss.stats?.length ?? 0) > 0 ||
      hasTrackedBossKill(boss.trackingSessions),
  );
  const latestSession = game.trackingSessions[0] ?? null;
  const deaths = latestSession
    ? (latestSession.finalDeaths ??
      latestSession.startDeaths + latestSession.deathCount)
    : encounteredBosses.reduce(
        (total, boss) => total + (boss.stats?.[0]?.deaths ?? 0),
        0,
      );

  return {
    gameName: game.name,
    deaths,
    killedBossCount: killedBosses.length,
    pendingBossCount: encounteredBosses.length - killedBosses.length,
  };
};

export const summarizeRecentBossEncounters = (
  bosses: RecentBossEncounterStats[],
) =>
  bosses
    .map((boss) => {
      const stats = summarizeCombinedBossStats({
        stats: boss.stats ?? [],
        trackingSessions: boss.trackingSessions,
      });

      if (!stats) {
        return null;
      }

      return {
        boss,
        stats,
        focusedAt: boss.trackingSessions[0]?.focusedAt.getTime() ?? null,
      };
    })
    .filter((encounter) => encounter !== null)
    .sort((left, right) => {
      if (left.focusedAt !== null && right.focusedAt === null) {
        return -1;
      }

      if (left.focusedAt === null && right.focusedAt !== null) {
        return 1;
      }

      if (left.focusedAt !== null && right.focusedAt !== null) {
        return right.focusedAt - left.focusedAt;
      }

      const deathDifference =
        (right.stats.deaths ?? 0) - (left.stats.deaths ?? 0);

      if (deathDifference !== 0) {
        return deathDifference;
      }

      return left.boss.name.localeCompare(right.boss.name);
    })
    .slice(0, 3)
    .map(({ boss, stats }) => {
      const killed =
        (boss.stats?.length ?? 0) > 0 ||
        hasTrackedBossKill(boss.trackingSessions);

      return {
        bossName: boss.name,
        deaths: stats.deaths ?? 0,
        averageAttemptSeconds: stats.averageAttemptSeconds,
        winningAttemptSeconds: killed ? stats.winningAttemptSeconds : null,
      };
    });
