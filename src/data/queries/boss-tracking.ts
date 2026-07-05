import { BossTrackingSessionStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { OPEN_BOSS_TRACKING_SESSION_STATUSES } from '../boss-tracking.constants';
import type { FindOpenBossTrackingBossesForAutocompleteInput } from './boss-stats.types';

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
      status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
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

export const findBossTrackingStatusSession = async () =>
  (await prisma.bossTrackingSession.findFirst({
    where: {
      status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
    },
    include: bossTrackingSessionInclude,
    orderBy: { focusedAt: 'desc' },
  })) ??
  prisma.bossTrackingSession.findFirst({
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
      status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
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

export const findTrackedGameStatus = (normalizedGameName: string) =>
  prisma.bossGame.findFirst({
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
            include: bossTrackingSessionInclude,
            orderBy: { focusedAt: 'desc' },
          },
        },
      },
    },
  });
