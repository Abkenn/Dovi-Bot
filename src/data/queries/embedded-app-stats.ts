import {
  BossEncounterSource,
  BossTrackingAttemptResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { OPEN_BOSS_TRACKING_SESSION_STATUSES } from '../boss-tracking.constants';

const findEmbeddedAppArchiveGames = (guildIds: string[]) =>
  prisma.bossGame.findMany({
    where: {
      bosses: {
        some: {
          OR: [
            {
              stats: {
                some: {
                  source: BossEncounterSource.DAVI_SPREADSHEET,
                  deaths: { not: null },
                },
              },
            },
            {
              trackingSessions: {
                some: {
                  guildId: { in: guildIds },
                  status: { not: BossTrackingSessionStatus.CANCELLED },
                },
              },
            },
          ],
        },
      },
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      trackingSessions: {
        where: {
          guildId: { in: guildIds },
          status: { not: BossTrackingSessionStatus.CANCELLED },
        },
        orderBy: [{ focusedAt: 'desc' }, { startedAt: 'desc' }],
        take: 1,
        select: {
          startDeaths: true,
          deathCount: true,
          finalDeaths: true,
        },
      },
      bosses: {
        where: {
          OR: [
            {
              stats: {
                some: {
                  source: BossEncounterSource.DAVI_SPREADSHEET,
                  deaths: { not: null },
                },
              },
            },
            {
              trackingSessions: {
                some: {
                  guildId: { in: guildIds },
                  status: { not: BossTrackingSessionStatus.CANCELLED },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          stats: {
            where: {
              source: BossEncounterSource.DAVI_SPREADSHEET,
              deaths: { not: null },
            },
            take: 1,
            select: {
              deaths: true,
              winningAttemptTimeSeconds: true,
            },
          },
          trackingSessions: {
            where: {
              guildId: { in: guildIds },
              status: { not: BossTrackingSessionStatus.CANCELLED },
            },
            orderBy: [{ focusedAt: 'desc' }, { startedAt: 'desc' }],
            select: {
              deathCount: true,
              endResult: true,
              status: true,
              focusedAt: true,
              attempts: {
                where: { result: BossTrackingAttemptResult.KILLED },
                orderBy: { attemptNumber: 'desc' },
                take: 1,
                select: {
                  startedAt: true,
                  endedAt: true,
                  vodStartSeconds: true,
                  vodEndSeconds: true,
                },
              },
            },
          },
        },
      },
    },
  });

export const findEmbeddedAppGameStats = async (guildIds: string[]) => {
  const archiveGamesPromise = findEmbeddedAppArchiveGames(guildIds);
  const latestSession = await prisma.bossTrackingSession.findFirst({
    where: {
      guildId: { in: guildIds },
      status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
    },
    select: {
      gameId: true,
      game: { select: { id: true, name: true } },
    },
    orderBy: [{ focusedAt: 'desc' }, { startedAt: 'desc' }],
  });
  const fallbackSession = latestSession
    ? null
    : await prisma.bossTrackingSession.findFirst({
        where: {
          guildId: { in: guildIds },
          status: { not: BossTrackingSessionStatus.CANCELLED },
        },
        select: {
          gameId: true,
          game: { select: { id: true, name: true } },
        },
        orderBy: [{ focusedAt: 'desc' }, { startedAt: 'desc' }],
      });
  const targetSession = latestSession ?? fallbackSession;

  if (!targetSession) {
    return {
      game: null,
      gameDeaths: 0,
      sessions: [],
      archiveGames: await archiveGamesPromise,
    };
  }

  const sessions = await prisma.bossTrackingSession.findMany({
    where: {
      guildId: { in: guildIds },
      gameId: targetSession.gameId,
      status: { not: BossTrackingSessionStatus.CANCELLED },
    },
    select: {
      guildId: true,
      status: true,
      startDeaths: true,
      deathCount: true,
      finalDeaths: true,
      pausedAt: true,
      startedAt: true,
      focusedAt: true,
      endedAt: true,
      endResult: true,
      boss: { select: { name: true, runbackSeconds: true } },
      attempts: {
        where: { result: BossTrackingAttemptResult.IN_PROGRESS },
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          attemptNumber: true,
          startedAt: true,
          runbackSeconds: true,
        },
      },
      pauses: {
        where: { endedAt: null },
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { reason: true },
      },
    },
    orderBy: [{ focusedAt: 'desc' }, { startedAt: 'desc' }],
  });

  const latestGameSession = sessions[0] ?? null;
  const gameDeaths = latestGameSession
    ? (latestGameSession.finalDeaths ??
      latestGameSession.startDeaths + latestGameSession.deathCount)
    : 0;

  return {
    game: targetSession.game,
    gameDeaths,
    sessions,
    archiveGames: await archiveGamesPromise,
  };
};
