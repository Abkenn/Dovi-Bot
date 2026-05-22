import { BossTrialStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import {
  getVoteBreakdown,
  getWinningVerdicts,
  shouldShowBossTrialVotes,
} from './boss-trial.service';
import {
  BOSS_TRIAL_VERDICT_LABELS,
  BOSS_TRIAL_VERDICTS,
} from './boss-trial.types';

const RECENT_TRIAL_LIMIT = 8;
const LEADERBOARD_LIMIT = 5;

const bossTrialStatsInclude = {
  game: true,
  boss: true,
  votes: true,
} as const;

export type BossTrialStatsTrial = Awaited<
  ReturnType<typeof getBossTrialStats>
>['trials'][number];

const formatVerdictLabels = (trial: BossTrialStatsTrial) => {
  const winningVerdicts = getWinningVerdicts(trial);

  if (winningVerdicts.length === 0) {
    return 'No votes yet';
  }

  const labels = winningVerdicts.map(
    (verdict) => BOSS_TRIAL_VERDICT_LABELS[verdict],
  );

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `Tie between ${labels.join(' and ')}`;
  }

  return `Tie between ${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
};

export const getBossTrialResultText = (trial: BossTrialStatsTrial) => {
  if (
    trial.status !== BossTrialStatus.RESULTS_PUBLISHED &&
    !shouldShowBossTrialVotes(trial)
  ) {
    return 'Hidden for now';
  }

  const breakdown = getVoteBreakdown(trial);
  const counts = BOSS_TRIAL_VERDICTS.map(
    (verdict) => `${BOSS_TRIAL_VERDICT_LABELS[verdict]} ${breakdown[verdict]}`,
  ).join(', ');

  return `${formatVerdictLabels(trial)} (${counts})`;
};

export const getBossTrialStats = async (guildId: string) => {
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
    guildId,
    totalTrials,
    totalVotes,
    trials,
    creators: creatorRows.map((row) => ({
      userId: row.requesterUserId,
      count: row._count._all,
    })),
    participants: participantRows.map((row) => ({
      userId: row.userId,
      count: row._count._all,
    })),
  };
};
