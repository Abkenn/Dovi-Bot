import type { Prisma } from '../../generated/prisma/client';
import type {
  BossTrialBumpMode,
  BossTrialVoteVerdict,
} from '../../generated/prisma/enums';
import {
  BossEncounterSource,
  BossTrialBumpMode as BossTrialBumpModeEnum,
  BossTrialStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { DAY_MINUTES } from '../../lib/time.constants';

export const areBossTrialTablesPresent = async () => {
  const schemaObjects = await prisma.$queryRaw<{ objectName: string | null }[]>`
    select to_regclass('public."BossTrial"')::text as "objectName"
    union all
    select to_regclass('public."BossTrialVote"')::text as "objectName"
    union all
    select to_regclass('public."BossTrialBumpMessage"')::text as "objectName"
    union all
    select "column_name" as "objectName"
    from information_schema.columns
    where "table_schema" = 'public'
      and "table_name" = 'BossTrial'
      and "column_name" = 'bumpMode'
  `;

  return (
    schemaObjects.length === 4 &&
    schemaObjects.every((object) => object.objectName !== null)
  );
};

const bossTrialViewInclude = {
  game: true,
  boss: {
    include: {
      stats: {
        where: { source: BossEncounterSource.DAVI_SPREADSHEET },
        take: 1,
      },
    },
  },
  votes: true,
  bumpMessages: true,
} as const;

export const createBossTrialView = ({
  guildId,
  channelId,
  requesterUserId,
  gameId,
  bossId,
  durationMinutes,
  voteVisibilityHiddenUntil,
  endsAt,
  bumpMode,
}: {
  guildId: string;
  channelId: string;
  requesterUserId: string;
  gameId: string;
  bossId: string;
  durationMinutes: number;
  voteVisibilityHiddenUntil: Date;
  endsAt: Date;
  bumpMode: BossTrialBumpMode;
}) =>
  prisma.bossTrial.create({
    data: {
      guildId,
      channelId,
      requesterUserId,
      gameId,
      bossId,
      durationMinutes,
      voteVisibilityHiddenUntil,
      endsAt,
      bumpMode,
    },
    include: bossTrialViewInclude,
  });

export const attachBossTrialMessageAndGetView = ({
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

export const attachBossTrialBumpMessage = ({
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

export const findBossTrialVoteVerdict = ({
  trialId,
  userId,
}: {
  trialId: string;
  userId: string;
}) =>
  prisma.bossTrialVote.findUnique({
    where: {
      trialId_userId: {
        trialId,
        userId,
      },
    },
    select: { verdict: true },
  });

export const upsertBossTrialVoteVerdict = ({
  trialId,
  userId,
  verdict,
  votedAt,
}: {
  trialId: string;
  userId: string;
  verdict: BossTrialVoteVerdict;
  votedAt: Date;
}) =>
  prisma.bossTrialVote.upsert({
    where: {
      trialId_userId: {
        trialId,
        userId,
      },
    },
    update: { verdict, votedAt },
    create: {
      trialId,
      userId,
      verdict,
      votedAt,
    },
  });

export const getBossTrialView = (trialId: string) =>
  prisma.bossTrial.findUniqueOrThrow({
    where: { id: trialId },
    include: bossTrialViewInclude,
  });

export const getPendingBossTrialLifecycleEvents = ({
  now,
  automaticBumpCreatedAtCutoff,
}: {
  now: Date;
  automaticBumpCreatedAtCutoff: Date;
}) =>
  prisma.bossTrial.findMany({
    where: {
      OR: [
        {
          durationMinutes: DAY_MINUTES,
          bumpMode: {
            in: [
              BossTrialBumpModeEnum.DEFAULT,
              BossTrialBumpModeEnum.MID_POLL_ONLY,
            ],
          },
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
  } satisfies Prisma.BossTrialUpdateManyMutationInput);

export type BossTrialView = Awaited<ReturnType<typeof getBossTrialView>>;
