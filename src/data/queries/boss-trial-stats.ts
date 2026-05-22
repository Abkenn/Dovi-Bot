import { prisma } from '../../lib/prisma';

const RECENT_TRIAL_LIMIT = 8;
const LEADERBOARD_LIMIT = 5;

const bossTrialStatsInclude = {
  game: true,
  boss: true,
  votes: true,
} as const;

export const getBossTrialStatsRows = async (guildId: string) => {
  const [trials, creatorRows, participantRows, totalTrials, totalVotes] =
    await Promise.all([
      prisma.bossTrial.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_TRIAL_LIMIT,
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

  return {
    trials,
    creatorRows,
    participantRows,
    totalTrials,
    totalVotes,
  };
};
