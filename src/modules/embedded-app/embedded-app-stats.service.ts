import { findEmbeddedAppGameStats } from '../../data/queries/embedded-app-stats';
import {
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { getGameBossDeathRanking } from '../bosses/bosses.service';
import {
  getGameBossStatsRows,
  hasTrackedBossKill,
} from '../bosses/bosses.stats';
import type {
  EmbeddedAppCurrentBoss,
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

const toCurrentBoss = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppCurrentBoss | null => {
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
    pausedAt: session.pausedAt?.toISOString() ?? null,
    pauseReason: openPause?.reason ?? null,
  };
};

const getKilledBosses = async (gameName: string) => {
  const gameStats = await getGameBossDeathRanking(gameName, { limit: null });
  const killedGameStats = {
    ...gameStats,
    trackedBosses: gameStats.trackedBosses.filter((boss) =>
      hasTrackedBossKill(boss.trackingSessions),
    ),
  };

  return getGameBossStatsRows(killedGameStats, { limit: null }).map(
    ({ name, deaths }) => ({ name, deaths }),
  );
};

const toLatestStreamEncounters = (
  sessions: EmbeddedAppStatsSession[],
): EmbeddedAppStreamEncounter[] => {
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

  const encounters = new Map<string, EmbeddedAppStreamEncounter>();

  for (const session of latestStreamSessions.reverse()) {
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

export const getEmbeddedAppStats = async (
  guildId: string,
): Promise<EmbeddedAppStats> => {
  const result = await findEmbeddedAppGameStats(guildId);

  if (!result) {
    return {
      game: null,
      currentBoss: null,
      streamEncounters: [],
      killedBosses: [],
    };
  }

  const killedBosses = await getKilledBosses(result.game.name);

  return {
    game: {
      id: result.game.id,
      name: result.game.name,
      deaths: result.gameDeaths,
      killedBossCount: killedBosses.length,
    },
    currentBoss: toCurrentBoss(result.sessions),
    streamEncounters: toLatestStreamEncounters(result.sessions),
    killedBosses,
  };
};
