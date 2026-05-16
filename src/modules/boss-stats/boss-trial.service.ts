import { DateTime } from 'luxon';
import {
  BossTrialStatus,
  BossTrialVoteVerdict,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { getBossStatsBossView } from './boss-stats.service';
import {
  BOSS_TRIAL_VERDICTS,
  getBossTrialDurationConfig,
} from './boss-trial.types';

export const isBossTrialStorageReady = async () => {
  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossTrial"')::text as "tableName"
    union all
    select to_regclass('public."BossTrialVote"')::text as "tableName"
  `;

  return tables.every((table) => table.tableName !== null);
};

const assertBossTrialStorageReady = async () => {
  if (!(await isBossTrialStorageReady())) {
    throw new Error(
      'Boss trial tables do not exist yet. Apply the Prisma schema before using boss trials.',
    );
  }
};

export const createBossTrial = async ({
  guildId,
  channelId,
  requesterUserId,
  gameName,
  bossName,
  duration,
}: {
  guildId: string;
  channelId: string;
  requesterUserId: string;
  gameName: string;
  bossName: string;
  duration: string | null;
}) => {
  await assertBossTrialStorageReady();

  const boss = await getBossStatsBossView({ gameName, bossName });
  const durationConfig = getBossTrialDurationConfig(duration);
  const now = DateTime.utc();

  return prisma.bossTrial.create({
    data: {
      guildId,
      channelId,
      requesterUserId,
      gameId: boss.gameId,
      bossId: boss.id,
      durationMinutes: durationConfig.durationMinutes,
      voteVisibilityHiddenUntil: now
        .plus({ minutes: durationConfig.hiddenMinutes })
        .toJSDate(),
      endsAt: now.plus({ minutes: durationConfig.durationMinutes }).toJSDate(),
    },
    include: bossTrialViewInclude,
  });
};

export const attachBossTrialMessage = async ({
  trialId,
  messageId,
}: {
  trialId: string;
  messageId: string;
}) =>
  prisma.bossTrial.update({
    where: { id: trialId },
    data: { messageId },
    include: bossTrialViewInclude,
  });

export const recordBossTrialVote = async ({
  trialId,
  userId,
  verdict,
}: {
  trialId: string;
  userId: string;
  verdict: BossTrialVoteVerdict;
}) => {
  if (!BOSS_TRIAL_VERDICTS.includes(verdict)) {
    throw new Error('Unknown boss trial verdict.');
  }

  const now = new Date();

  await prisma.bossTrialVote.upsert({
    where: {
      trialId_userId: {
        trialId,
        userId,
      },
    },
    update: {
      verdict,
      votedAt: now,
    },
    create: {
      trialId,
      userId,
      verdict,
      votedAt: now,
    },
  });

  return getBossTrialView(trialId);
};

export const markBossTrialLiveResultsPublished = async (trialId: string) =>
  prisma.bossTrial.update({
    where: { id: trialId },
    data: { liveResultsPublishedAt: new Date() },
    include: bossTrialViewInclude,
  });

export const markBossTrialFinalResultsPosted = async (trialId: string) =>
  prisma.bossTrial.update({
    where: { id: trialId },
    data: {
      status: BossTrialStatus.RESULTS_PUBLISHED,
      finalResultsPostedAt: new Date(),
    },
    include: bossTrialViewInclude,
  });

export const getBossTrialView = (trialId: string) =>
  prisma.bossTrial.findUniqueOrThrow({
    where: { id: trialId },
    include: bossTrialViewInclude,
  });

export const getPendingBossTrialLifecycleEvents = async () => {
  const now = new Date();

  return prisma.bossTrial.findMany({
    where: {
      OR: [
        {
          liveResultsPublishedAt: null,
          voteVisibilityHiddenUntil: { lte: now },
          messageId: { not: null },
        },
        {
          finalResultsPostedAt: null,
          endsAt: { lte: now },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: bossTrialViewInclude,
  });
};

export const getVoteBreakdown = (
  trial: BossTrialView,
): Record<BossTrialVoteVerdict, number> => {
  const breakdown = Object.fromEntries(
    BOSS_TRIAL_VERDICTS.map((verdict) => [verdict, 0]),
  ) as Record<BossTrialVoteVerdict, number>;

  for (const vote of trial.votes) {
    breakdown[vote.verdict] += 1;
  }

  return breakdown;
};

export const getWinningVerdict = (trial: BossTrialView) => {
  const breakdown = getVoteBreakdown(trial);
  const [winningVerdict] = [...BOSS_TRIAL_VERDICTS].sort(
    (left, right) => breakdown[right] - breakdown[left],
  );

  return winningVerdict ?? BossTrialVoteVerdict.PEAK;
};

export const shouldShowBossTrialVotes = (trial: BossTrialView) =>
  Date.now() >= trial.voteVisibilityHiddenUntil.getTime();

export const shouldPostBossTrialFinalResults = (trial: BossTrialView) =>
  !trial.finalResultsPostedAt && Date.now() >= trial.endsAt.getTime();

export const shouldPublishBossTrialLiveResults = (trial: BossTrialView) =>
  !trial.liveResultsPublishedAt && shouldShowBossTrialVotes(trial);

const bossTrialViewInclude = {
  game: true,
  boss: {
    include: {
      stats: {
        where: { source: 'DAVI_SPREADSHEET' },
        take: 1,
      },
    },
  },
  votes: true,
} as const;

export type BossTrialView = Awaited<ReturnType<typeof getBossTrialView>>;
