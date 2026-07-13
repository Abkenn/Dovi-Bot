import {
  BossTrackingAttemptResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { OPEN_BOSS_TRACKING_SESSION_STATUSES } from '../boss-tracking.constants';

export const findEmbeddedAppGameStats = async (guildId: string) => {
  const latestSession = await prisma.bossTrackingSession.findFirst({
    where: {
      guildId,
      status: { in: OPEN_BOSS_TRACKING_SESSION_STATUSES },
    },
    select: {
      gameId: true,
      game: { select: { id: true, name: true } },
    },
    orderBy: { focusedAt: 'desc' },
  });
  const fallbackSession = latestSession
    ? null
    : await prisma.bossTrackingSession.findFirst({
        where: {
          guildId,
          status: { not: BossTrackingSessionStatus.CANCELLED },
        },
        select: {
          gameId: true,
          game: { select: { id: true, name: true } },
        },
        orderBy: { focusedAt: 'desc' },
      });
  const targetSession = latestSession ?? fallbackSession;

  if (!targetSession) {
    return null;
  }

  const sessions = await prisma.bossTrackingSession.findMany({
    where: {
      guildId,
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
      boss: { select: { name: true } },
      attempts: {
        where: { result: BossTrackingAttemptResult.IN_PROGRESS },
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: { attemptNumber: true, startedAt: true },
      },
      pauses: {
        where: { endedAt: null },
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { reason: true },
      },
    },
    orderBy: { focusedAt: 'desc' },
  });

  const latestGameSession = sessions[0] ?? null;
  const gameDeaths = latestGameSession
    ? (latestGameSession.finalDeaths ??
      latestGameSession.startDeaths + latestGameSession.deathCount)
    : 0;

  return { game: targetSession.game, gameDeaths, sessions };
};
