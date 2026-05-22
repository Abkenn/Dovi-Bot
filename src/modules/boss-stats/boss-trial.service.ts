import { DateTime } from 'luxon';
import {
  BossTrialStatus,
  BossTrialVoteVerdict,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { getBossStatsBossView } from './boss-stats.service';
import {
  BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES,
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

export const attachBossTrialBumpMessage = async ({
  trialId,
  messageId,
}: {
  trialId: string;
  messageId: string;
}) =>
  prisma.bossTrialBumpMessage.upsert({
    where: { messageId },
    update: { trialId },
    create: { trialId, messageId },
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

  const existingVote = await prisma.bossTrialVote.findUnique({
    where: {
      trialId_userId: {
        trialId,
        userId,
      },
    },
    select: { verdict: true },
  });

  if (existingVote?.verdict === verdict) {
    return {
      trial: await getBossTrialView(trialId),
      voteAction: 'unchanged' as const,
      previousVerdict: existingVote.verdict,
    };
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

  return {
    trial: await getBossTrialView(trialId),
    voteAction: existingVote ? ('changed' as const) : ('created' as const),
    previousVerdict: existingVote?.verdict ?? null,
  };
};

export const markBossTrialLiveResultsPublished = async (trialId: string) =>
  prisma.bossTrial.update({
    where: { id: trialId },
    data: { liveResultsPublishedAt: new Date() },
    include: bossTrialViewInclude,
  });

export const markBossTrialAutomaticBumpPosted = async (trialId: string) =>
  prisma.bossTrial.update({
    where: { id: trialId },
    data: { automaticBumpPostedAt: new Date() },
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
  const automaticBumpCreatedAtCutoff = DateTime.fromJSDate(now)
    .minus({ minutes: BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES })
    .toJSDate();

  return prisma.bossTrial.findMany({
    where: {
      OR: [
        {
          durationMinutes: 24 * 60,
          automaticBumpPostedAt: null,
          createdAt: { lte: automaticBumpCreatedAtCutoff },
          endsAt: { gt: now },
          messageId: { not: null },
        },
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

type BossTrialWithVotes = {
  votes: { verdict: BossTrialVoteVerdict }[];
};

type BossTrialWithVoteVisibility = {
  voteVisibilityHiddenUntil: Date;
};

export const getVoteBreakdown = (
  trial: BossTrialWithVotes,
): Record<BossTrialVoteVerdict, number> => {
  const breakdown = Object.fromEntries(
    BOSS_TRIAL_VERDICTS.map((verdict) => [verdict, 0]),
  ) as Record<BossTrialVoteVerdict, number>;

  for (const vote of trial.votes) {
    breakdown[vote.verdict] += 1;
  }

  return breakdown;
};

export const getWinningVerdict = (trial: BossTrialWithVotes) => {
  const [winningVerdict] = getWinningVerdicts(trial);

  return winningVerdict ?? BossTrialVoteVerdict.PEAK;
};

export const getWinningVerdicts = (trial: BossTrialWithVotes) => {
  const breakdown = getVoteBreakdown(trial);
  const highestVoteCount = Math.max(
    ...BOSS_TRIAL_VERDICTS.map((verdict) => breakdown[verdict]),
  );

  if (highestVoteCount <= 0) {
    return [];
  }

  return BOSS_TRIAL_VERDICTS.filter(
    (verdict) => breakdown[verdict] === highestVoteCount,
  );
};

export const shouldShowBossTrialVotes = (trial: BossTrialWithVoteVisibility) =>
  Date.now() >= trial.voteVisibilityHiddenUntil.getTime();

export const shouldPostBossTrialFinalResults = (trial: BossTrialView) =>
  !trial.finalResultsPostedAt && Date.now() >= trial.endsAt.getTime();

export const shouldPublishBossTrialLiveResults = (trial: BossTrialView) =>
  !trial.liveResultsPublishedAt && shouldShowBossTrialVotes(trial);

export const shouldPostBossTrialAutomaticBump = (trial: BossTrialView) =>
  trial.durationMinutes === 24 * 60 &&
  !trial.automaticBumpPostedAt &&
  Date.now() >=
    trial.createdAt.getTime() +
      BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES * 60 * 1000 &&
  Date.now() < trial.endsAt.getTime();

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
  bumpMessages: true,
} as const;

export type BossTrialView = Awaited<ReturnType<typeof getBossTrialView>>;
