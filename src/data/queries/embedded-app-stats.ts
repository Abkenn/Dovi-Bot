import { BossTrackingSessionStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { OPEN_BOSS_TRACKING_SESSION_STATUSES } from '../boss-tracking.constants';
import { bossTrackingSessionInclude } from './boss-tracking';

export const findEmbeddedAppGameStats = async (guildId: string) => {
  const latestSession = await prisma.bossTrackingSession.findFirst({
    where: {
      guildId,
      status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
    },
    select: { gameId: true },
    orderBy: { focusedAt: 'desc' },
  });
  const fallbackSession = latestSession
    ? null
    : await prisma.bossTrackingSession.findFirst({
        where: {
          guildId,
          status: { not: BossTrackingSessionStatus.CANCELLED },
        },
        select: { gameId: true },
        orderBy: { focusedAt: 'desc' },
      });
  const gameId = latestSession?.gameId ?? fallbackSession?.gameId;

  if (!gameId) {
    return null;
  }

  const game = await prisma.bossGame.findUnique({
    where: { id: gameId },
    select: { id: true, name: true },
  });
  const sessions = await prisma.bossTrackingSession.findMany({
    where: {
      guildId,
      gameId,
      status: { not: BossTrackingSessionStatus.CANCELLED },
    },
    include: bossTrackingSessionInclude,
    orderBy: { focusedAt: 'desc' },
  });

  if (!game) {
    return null;
  }

  const latestGameSession = sessions[0] ?? null;
  const gameDeaths = latestGameSession
    ? (latestGameSession.finalDeaths ??
      latestGameSession.startDeaths + latestGameSession.deathCount)
    : 0;

  return { game, gameDeaths, sessions };
};
