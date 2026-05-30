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
