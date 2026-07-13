import type { Prisma } from '../../generated/prisma/client';
import {
  BossEncounterSource,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import type {
  FindBossesForAutocompleteInput,
  FindBossWithDaviSpreadsheetStatsInput,
  FindGameBossDeathRankingInput,
} from './boss-stats.types';

const AUTOCOMPLETE_LIMIT = 25;

export const areBossStatsTablesPresent = async () => {
  const tables = await prisma.$queryRaw<{ tableName: string | null }[]>`
    select to_regclass('public."BossGame"')::text as "tableName"
    union all
    select to_regclass('public."Boss"')::text as "tableName"
    union all
    select to_regclass('public."BossEncounterStat"')::text as "tableName"
  `;

  return tables.every((table) => table.tableName !== null);
};

export const findBossGamesForAutocomplete = (normalizedQuery: string) =>
  prisma.bossGame.findMany({
    ...(normalizedQuery
      ? {
          where: {
            OR: [
              { normalizedName: { contains: normalizedQuery } },
              {
                topicTerms: {
                  some: { normalizedValue: { contains: normalizedQuery } },
                },
              },
            ],
          },
        }
      : {}),
    orderBy: { name: 'asc' },
    take: AUTOCOMPLETE_LIMIT,
    select: { name: true },
  });

export const findBossesForAutocomplete = async ({
  normalizedGameName,
  normalizedBossQuery,
  requireEncounterData,
}: FindBossesForAutocompleteInput) => {
  const game = normalizedGameName
    ? await prisma.bossGame.findFirst({
        where: {
          OR: [
            { normalizedName: normalizedGameName },
            {
              topicTerms: {
                some: { normalizedValue: normalizedGameName },
              },
            },
          ],
        },
        select: { id: true },
      })
    : null;

  if (normalizedGameName && !game) {
    return [];
  }

  const where: Prisma.BossWhereInput = {};

  if (game) {
    where.gameId = game.id;
  }

  if (normalizedBossQuery) {
    where.OR = [
      { normalizedName: { contains: normalizedBossQuery } },
      {
        topicTerms: {
          some: { normalizedValue: { contains: normalizedBossQuery } },
        },
      },
    ];
  }

  if (requireEncounterData) {
    where.AND = [
      {
        OR: [
          {
            stats: {
              some: {
                OR: [
                  { deaths: { not: null } },
                  { totalAttemptTimeSeconds: { not: null } },
                  { winningAttemptTimeSeconds: { not: null } },
                  { difficultyCoefficient: { not: null } },
                ],
              },
            },
          },
          {
            trackingSessions: {
              some: { status: { not: BossTrackingSessionStatus.CANCELLED } },
            },
          },
        ],
      },
    ];
  }

  return prisma.boss.findMany({
    where,
    orderBy: [{ game: { name: 'asc' } }, { name: 'asc' }],
    take: AUTOCOMPLETE_LIMIT * 2,
    select: { name: true, game: { select: { name: true } } },
  });
};

export const findBossWithDaviSpreadsheetStats = ({
  normalizedGameName,
  normalizedBossName,
}: FindBossWithDaviSpreadsheetStatsInput) =>
  prisma.boss.findFirst({
    where: {
      normalizedName: normalizedBossName,
      ...(normalizedGameName
        ? { game: { normalizedName: normalizedGameName } }
        : {}),
    },
    include: {
      game: true,
      stats: {
        where: { source: BossEncounterSource.DAVI_SPREADSHEET },
        take: 1,
      },
      trackingSessions: {
        where: { status: { not: BossTrackingSessionStatus.CANCELLED } },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          guildId: true,
          channelId: true,
          trackerUserId: true,
          status: true,
          startDeaths: true,
          deathCount: true,
          recordedDeathCount: true,
          finalDeaths: true,
          endResult: true,
          manualTrackedSeconds: true,
          vodLabel: true,
          vodStartSeconds: true,
          vodEndSeconds: true,
          attemptTimingStatus: true,
          reconciliationNote: true,
          totalPausedSeconds: true,
          pausedAt: true,
          startedAt: true,
          focusedAt: true,
          endedAt: true,
          notes: true,
          game: true,
          boss: {
            include: { game: true },
          },
          attempts: {
            orderBy: { attemptNumber: 'desc' },
          },
          pauses: {
            orderBy: { startedAt: 'desc' },
          },
        },
      },
    },
  });

export const countBossesByNormalizedName = (normalizedBossName: string) =>
  prisma.boss.count({
    where: { normalizedName: normalizedBossName },
  });

export const findGameBossDeathRanking = async ({
  normalizedGameName,
  limit,
}: FindGameBossDeathRankingInput) => {
  const game = await prisma.bossGame.findFirst({
    where: {
      OR: [
        { normalizedName: normalizedGameName },
        {
          topicTerms: {
            some: { normalizedValue: normalizedGameName },
          },
        },
      ],
    },
    select: { id: true, name: true },
  });

  if (!game) {
    return null;
  }

  const statsQuery = {
    where: {
      source: BossEncounterSource.DAVI_SPREADSHEET,
      deaths: { not: null },
      boss: { gameId: game.id },
    },
    orderBy: [{ deaths: 'desc' }, { boss: { name: 'asc' } }],
    ...(limit === null || limit === undefined ? {} : { take: limit }),
    include: {
      boss: true,
    },
  } satisfies Prisma.BossEncounterStatFindManyArgs;
  const stats = await prisma.bossEncounterStat.findMany(statsQuery);
  const trackedBosses = await prisma.boss.findMany({
    where: {
      gameId: game.id,
      trackingSessions: {
        some: { status: { not: BossTrackingSessionStatus.CANCELLED } },
      },
    },
    orderBy: { name: 'asc' },
    include: {
      trackingSessions: {
        where: { status: { not: BossTrackingSessionStatus.CANCELLED } },
        select: {
          deathCount: true,
          endResult: true,
        },
      },
    },
  });

  return { game, stats, trackedBosses };
};
