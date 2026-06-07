import {
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import type { FindOpenBossTrackingBossesForAutocompleteInput } from './boss-stats.types';

const ACTIVE_SESSION_STATUSES = [
  BossTrackingSessionStatus.ACTIVE,
  BossTrackingSessionStatus.PAUSED,
];

export const bossTrackingSessionInclude = {
  game: true,
  boss: {
    include: { game: true },
  },
  attempts: {
    orderBy: { attemptNumber: 'desc' },
  },
  pauses: {
    orderBy: { startedAt: 'desc' },
  },
} as const;

export const findActiveBossTrackingSession = (guildId: string) =>
  prisma.bossTrackingSession.findFirst({
    where: {
      guildId,
      status: { in: ACTIVE_SESSION_STATUSES },
    },
    include: bossTrackingSessionInclude,
    orderBy: { focusedAt: 'desc' },
  });

export const findLatestBossTrackingSession = (guildId: string) =>
  prisma.bossTrackingSession.findFirst({
    where: { guildId },
    include: bossTrackingSessionInclude,
    orderBy: { focusedAt: 'desc' },
  });

export const findOpenBossTrackingBossesForAutocomplete = async ({
  guildId,
  normalizedGameName,
  normalizedBossQuery,
}: FindOpenBossTrackingBossesForAutocompleteInput) => {
  const sessions = await prisma.bossTrackingSession.findMany({
    where: {
      guildId,
      status: { in: ACTIVE_SESSION_STATUSES },
      ...(normalizedGameName
        ? { game: { normalizedName: normalizedGameName } }
        : {}),
      ...(normalizedBossQuery
        ? {
            boss: {
              OR: [
                { normalizedName: { contains: normalizedBossQuery } },
                {
                  topicTerms: {
                    some: {
                      normalizedValue: { contains: normalizedBossQuery },
                    },
                  },
                },
              ],
            },
          }
        : {}),
    },
    include: {
      game: { select: { id: true, name: true } },
      boss: { select: { id: true, name: true } },
    },
    orderBy: { focusedAt: 'desc' },
    take: 25,
  });
  const seen = new Set<string>();

  return sessions
    .filter((session) => {
      const key = `${session.game.id}:${session.boss.id}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((session) => ({
      name: session.boss.name,
      gameName: session.game.name,
    }));
};

export const findTrackedGameStatus = async (normalizedGameName: string) => {
  const game = await prisma.bossGame.findFirst({
    where: {
      OR: [
        { normalizedName: normalizedGameName },
        {
          topicTerms: {
            some: { normalizedValue: normalizedGameName },
          },
        },
      ],
    },
    include: {
      trackingSessions: {
        where: {
          status: { not: BossTrackingSessionStatus.CANCELLED },
        },
        select: {
          startDeaths: true,
          deathCount: true,
          finalDeaths: true,
        },
        orderBy: { focusedAt: 'desc' },
        take: 1,
      },
      bosses: {
        include: {
          trackingSessions: {
            where: {
              status: { not: BossTrackingSessionStatus.CANCELLED },
            },
            select: {
              deathCount: true,
              endResult: true,
            },
          },
        },
      },
    },
  });

  if (!game) {
    return null;
  }

  const trackedBosses = game.bosses.filter(
    (boss) => boss.trackingSessions.length > 0,
  );
  const killedBosses = trackedBosses.filter((boss) =>
    boss.trackingSessions.some(
      (session) => session.endResult === BossTrackingEndResult.KILLED,
    ),
  );
  const latestSession = game.trackingSessions[0] ?? null;
  const totalDeaths = latestSession
    ? (latestSession.finalDeaths ??
      latestSession.startDeaths + latestSession.deathCount)
    : 0;

  return {
    gameName: game.name,
    deaths: totalDeaths,
    killedBossCount: killedBosses.length,
    pendingBossCount: trackedBosses.length - killedBosses.length,
  };
};
