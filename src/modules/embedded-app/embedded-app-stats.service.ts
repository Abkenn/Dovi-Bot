import { BOT_GUILDS } from '../../config/discord-access';
import { findEmbeddedAppGameStats } from '../../data/queries/embedded-app-stats';
import {
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import {
  getGameBossStatsRows,
  hasTrackedBossKill,
} from '../bosses/bosses.stats';
import { getStreamInfo } from '../stream-info/stream-info.service';
import type {
  EmbeddedAppArchivedGame,
  EmbeddedAppBoss,
  EmbeddedAppCurrentBoss,
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
  game: EmbeddedAppStatsQuery['archiveGames'][number],
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

  for (const boss of game.bosses) {
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
      return outcome ? [{ name, deaths, outcome }] : [];
    },
  );
  const killedBossCount = bosses.filter(
    (boss) => boss.outcome === 'KILLED',
  ).length;
  const killedBosses = bosses.filter((boss) => boss.outcome === 'KILLED');
  const latestSession = game.trackingSessions[0];
  const deaths = latestSession
    ? (latestSession.finalDeaths ??
      latestSession.startDeaths + latestSession.deathCount)
    : bosses.reduce((total, boss) => total + boss.deaths, 0);

  return {
    id: game.id,
    name: game.name,
    deaths,
    killedBossCount,
    bosses,
    killedBosses,
  };
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
): EmbeddedAppStreamEncounter[] => {
  const encounters = new Map<string, EmbeddedAppStreamEncounter>();

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

export const getEmbeddedAppStats = async (
  guildId: string,
): Promise<EmbeddedAppStats> => {
  const result = await findEmbeddedAppGameStats([
    BOT_GUILDS.STAGING_ENV,
    BOT_GUILDS.PROD_ENV,
  ]);
  const games = result.archiveGames.map(toArchivedGame).sort((left, right) => {
    if (left.id === result.game?.id) {
      return -1;
    }
    if (right.id === result.game?.id) {
      return 1;
    }
    return left.name.localeCompare(right.name);
  });

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
    };
  }

  const streamInfo = await getStreamInfo(guildId);
  const currentStream = streamInfo.current;
  const streamEncounters = currentStream
    ? toCurrentStreamEncounters(result.sessions, currentStream)
    : toLatestStreamEncounters(result.sessions);
  const currentGameArchive = games.find((game) => game.id === result.game?.id);
  const bosses = currentGameArchive?.bosses ?? [];

  return {
    game: {
      id: result.game.id,
      name: result.game.name,
      deaths: currentGameArchive?.deaths ?? result.gameDeaths,
      killedBossCount: currentGameArchive?.killedBossCount ?? 0,
    },
    currentBoss: toCurrentBoss(result.sessions),
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
  };
};
