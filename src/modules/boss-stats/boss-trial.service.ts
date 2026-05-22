import {
  BossTrialStatus,
  type BossTrialVoteVerdict,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { DAY_MINUTES, MINUTE_MS } from '../../lib/time.constants';
import { getBossStatsBossView } from './boss-stats.service';
import {
  BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES,
  BOSS_TRIAL_VERDICTS,
  getBossTrialDurationConfig,
} from './boss-trial.types';

const BOSS_TRIAL_STORAGE_MISSING_RECHECK_MS = 5 * MINUTE_MS;

let bossTrialStorageReady: boolean | undefined;
let bossTrialStorageLastCheckedAt = 0;

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * MINUTE_MS);

type BossTrialMessageInput = { trialId: string; messageId: string };

export const isBossTrialStorageReady = async () => {
  if (bossTrialStorageReady) {
    return true;
  }

  const now = Date.now();

  if (
    bossTrialStorageReady === false &&
    now - bossTrialStorageLastCheckedAt < BOSS_TRIAL_STORAGE_MISSING_RECHECK_MS
  ) {
    return false;
  }

  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossTrial"')::text as "tableName"
    union all
    select to_regclass('public."BossTrialVote"')::text as "tableName"
  `;

  bossTrialStorageReady = tables.every((table) => table.tableName !== null);
  bossTrialStorageLastCheckedAt = now;

  return bossTrialStorageReady;
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
  const now = new Date();

  return prisma.bossTrial.create({
    data: {
      guildId,
      channelId,
      requesterUserId,
      gameId: boss.gameId,
      bossId: boss.id,
      durationMinutes: durationConfig.durationMinutes,
      voteVisibilityHiddenUntil: addMinutes(now, durationConfig.hiddenMinutes),
      endsAt: addMinutes(now, durationConfig.durationMinutes),
    },
    include: bossTrialViewInclude,
  });
};

export const attachBossTrialMessage = async ({
  trialId,
  messageId,
}: BossTrialMessageInput) =>
  prisma.bossTrial.update({
    where: { id: trialId },
    data: { messageId },
    include: bossTrialViewInclude,
  });

export const attachBossTrialBumpMessage = async ({
  trialId,
  messageId,
}: BossTrialMessageInput) =>
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

  const where = {
    trialId_userId: {
      trialId,
      userId,
    },
  };

  const existingVote = await prisma.bossTrialVote.findUnique({
    where,
    select: { verdict: true },
  });

  if (existingVote?.verdict === verdict) {
    return {
      trial: await getBossTrialView(trialId),
      voteAction: 'unchanged' as const,
      previousVerdict: existingVote.verdict,
    };
  }

  const votedAt = new Date();

  await prisma.bossTrialVote.upsert({
    where,
    update: { verdict, votedAt },
    create: {
      trialId,
      userId,
      verdict,
      votedAt,
    },
  });

  return {
    trial: await getBossTrialView(trialId),
    voteAction: existingVote ? ('changed' as const) : ('created' as const),
    previousVerdict: existingVote?.verdict ?? null,
  };
};

type BossTrialUpdateManyInput = NonNullable<
  Parameters<typeof prisma.bossTrial.updateMany>[0]
>;
type BossTrialTimestampField =
  | 'liveResultsPublishedAt'
  | 'automaticBumpPostedAt'
  | 'finalResultsPostedAt';

const claimBossTrialTimestamp = async (
  trialId: string,
  field: BossTrialTimestampField,
  data: BossTrialUpdateManyInput['data'] = {},
) => {
  const result = await prisma.bossTrial.updateMany({
    where: {
      id: trialId,
      [field]: null,
    },
    data: { ...data, [field]: new Date() },
  });

  if (result.count === 0) {
    return null;
  }

  return getBossTrialView(trialId);
};

export const claimBossTrialLiveResults = (trialId: string) =>
  claimBossTrialTimestamp(trialId, 'liveResultsPublishedAt');

export const claimBossTrialAutomaticBump = (trialId: string) =>
  claimBossTrialTimestamp(trialId, 'automaticBumpPostedAt');

export const claimBossTrialFinalResults = (trialId: string) =>
  claimBossTrialTimestamp(trialId, 'finalResultsPostedAt', {
    status: BossTrialStatus.RESULTS_PUBLISHED,
  });

export const getBossTrialView = (trialId: string) =>
  prisma.bossTrial.findUniqueOrThrow({
    where: { id: trialId },
    include: bossTrialViewInclude,
  });

export const getPendingBossTrialLifecycleEvents = async () => {
  const now = new Date();
  const automaticBumpCreatedAtCutoff = addMinutes(
    now,
    -BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES,
  );

  return prisma.bossTrial.findMany({
    where: {
      OR: [
        {
          durationMinutes: DAY_MINUTES,
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

type BossTrialWithVotes = { votes: { verdict: BossTrialVoteVerdict }[] };

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

export const shouldShowBossTrialVotes = (trial: {
  voteVisibilityHiddenUntil: Date;
}) => Date.now() >= trial.voteVisibilityHiddenUntil.getTime();

export const shouldPostBossTrialFinalResults = (trial: BossTrialView) =>
  !trial.finalResultsPostedAt && Date.now() >= trial.endsAt.getTime();

export const shouldPublishBossTrialLiveResults = (trial: BossTrialView) =>
  !trial.liveResultsPublishedAt && shouldShowBossTrialVotes(trial);

export const shouldPostBossTrialAutomaticBump = (trial: BossTrialView) => {
  const now = Date.now();
  const bumpAt =
    trial.createdAt.getTime() +
    BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES * MINUTE_MS;

  return (
    trial.durationMinutes === DAY_MINUTES &&
    !trial.automaticBumpPostedAt &&
    now >= bumpAt &&
    now < trial.endsAt.getTime()
  );
};

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
