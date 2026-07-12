import { findEmbeddedAppGameStats } from '../../data/queries/embedded-app-stats';
import {
  BossTrackingAttemptResult,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import type {
  EmbeddedAppCurrentBoss,
  EmbeddedAppKilledBoss,
  EmbeddedAppStats,
} from './embedded-app-stats.types';

const OPEN_STATUSES = [
  BossTrackingSessionStatus.ACTIVE,
  BossTrackingSessionStatus.PAUSED,
] as const;

type EmbeddedAppStatsQuery = NonNullable<
  Awaited<ReturnType<typeof findEmbeddedAppGameStats>>
>;
type EmbeddedAppStatsSession = EmbeddedAppStatsQuery['sessions'][number];

const toCurrentBoss = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppCurrentBoss | null => {
  const session = sessions.find((candidate) =>
    OPEN_STATUSES.some((status) => status === candidate.status),
  );

  if (!session) {
    return null;
  }

  const attempt = session.attempts.find(
    (candidate) => candidate.result === BossTrackingAttemptResult.IN_PROGRESS,
  );
  const openPause = session.pauses.find((pause) => pause.endedAt === null);

  return {
    name: session.boss.name,
    status:
      session.status === BossTrackingSessionStatus.PAUSED
        ? BossTrackingSessionStatus.PAUSED
        : BossTrackingSessionStatus.ACTIVE,
    deaths: session.deathCount,
    attemptNumber: attempt?.attemptNumber ?? null,
    attemptStartedAt: attempt?.startedAt.toISOString() ?? null,
    pausedAt: session.pausedAt?.toISOString() ?? null,
    pauseReason: openPause?.reason ?? null,
  };
};

const toKilledBosses = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppKilledBoss[] =>
  sessions
    .filter(
      (session) =>
        session.endResult === BossTrackingEndResult.KILLED && session.endedAt,
    )
    .sort(
      (left, right) =>
        (left.endedAt?.getTime() ?? 0) - (right.endedAt?.getTime() ?? 0),
    )
    .map((session) => ({
      name: session.boss.name,
      deaths: session.deathCount,
      killedAt: session.endedAt?.toISOString() ?? '',
    }));

export const getEmbeddedAppStats = async (
  guildId: string,
): Promise<EmbeddedAppStats> => {
  const result = await findEmbeddedAppGameStats(guildId);

  if (!result) {
    return { game: null, currentBoss: null, killedBosses: [] };
  }

  const killedBosses = toKilledBosses(result.sessions);

  return {
    game: {
      id: result.game.id,
      name: result.game.name,
      deaths: result.gameDeaths,
      killedBossCount: killedBosses.length,
    },
    currentBoss: toCurrentBoss(result.sessions),
    killedBosses,
  };
};
