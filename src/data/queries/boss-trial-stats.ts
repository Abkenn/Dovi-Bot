import { BossTrialStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';

const RECENT_TRIAL_TARGET = 3;
const LEADERBOARD_LIMIT = 5;

const bossTrialStatsInclude = {
  game: true,
  boss: true,
  votes: true,
} as const;

export const getBossTrialStatsRows = async (guildId: string) => {
  const [
    ongoingTrials,
    finishedTrials,
    creatorRows,
    participantRows,
    totalTrials,
    totalVotes,
  ] = await Promise.all([
    prisma.bossTrial.findMany({
      where: { guildId, status: BossTrialStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: bossTrialStatsInclude,
    }),
    prisma.bossTrial.findMany({
      where: { guildId, status: BossTrialStatus.RESULTS_PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: RECENT_TRIAL_TARGET,
      include: bossTrialStatsInclude,
    }),
    prisma.bossTrial.groupBy({
      by: ['requesterUserId'],
      where: { guildId },
      _count: { _all: true },
      orderBy: { _count: { requesterUserId: 'desc' } },
      take: LEADERBOARD_LIMIT,
    }),
    prisma.bossTrialVote.groupBy({
      by: ['userId'],
      where: {
        trial: { guildId },
      },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: LEADERBOARD_LIMIT,
    }),
    prisma.bossTrial.count({ where: { guildId } }),
    prisma.bossTrialVote.count({
      where: {
        trial: { guildId },
      },
    }),
  ]);
  const finishedTrialLimit = Math.max(
    RECENT_TRIAL_TARGET - ongoingTrials.length,
    0,
  );
  const trials = [
    ...ongoingTrials,
    ...finishedTrials.slice(0, finishedTrialLimit),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return {
    trials,
    creatorRows,
    participantRows,
    totalTrials,
    totalVotes,
  };
};
