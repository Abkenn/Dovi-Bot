import { BossEncounterSource } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import { DAY_MINUTES } from '../../lib/time.constants';
import { createBossTrial as createBossTrialRow } from '../entity-queries/boss-trial';
import { upsertBossTrialBumpMessage } from '../entity-queries/boss-trial-bump-message';
import {
  findUniqueBossTrialVote,
  upsertBossTrialVote,
} from '../entity-queries/boss-trial-vote';

export const areBossTrialTablesPresent = async () => {
  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossTrial"')::text as "tableName"
    union all
    select to_regclass('public."BossTrialVote"')::text as "tableName"
  `;

  return tables.every((table) => table.tableName !== null);
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
}: {
  guildId: string;
  channelId: string;
  requesterUserId: string;
  gameId: string;
  bossId: string;
  durationMinutes: number;
  voteVisibilityHiddenUntil: Date;
  endsAt: Date;
}) =>
  createBossTrialRow({
    data: {
      guildId,
      channelId,
      requesterUserId,
      gameId,
      bossId,
      durationMinutes,
      voteVisibilityHiddenUntil,
      endsAt,
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
  upsertBossTrialBumpMessage({
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
  findUniqueBossTrialVote({
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
  verdict: Parameters<typeof upsertBossTrialVote>[0]['create']['verdict'];
  votedAt: Date;
}) =>
  upsertBossTrialVote({
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

export type BossTrialView = Awaited<ReturnType<typeof getBossTrialView>>;
