import { BossTrackingSessionStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';

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
    take: 1,
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
}: {
  guildId: string;
  normalizedGameName?: string;
  normalizedBossQuery: string;
}) => {
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
